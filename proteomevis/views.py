from django.shortcuts import render
from django.forms.models import model_to_dict
from django.http import HttpResponse,StreamingHttpResponse
import json, tempfile, random, string,csv,datetime
from .models import *
from django.views.decorators.csrf import csrf_exempt
from .FetchEdges import *
from django.template import loader, Context
from django.core.cache import cache
from django.template.context_processors import csrf
from wsgiref.util import FileWrapper


better_labels = {"degree_log":"degree", "weighted_degree_log":"weighted degree", "length":"length", "conden":"contact density", "abundance":"abundance", "ppi":"ppi","dostol":"dosage tolerance", "dN":"dN", "dS":"dS", "evorate":"evolutionary rate"}

def get_filename(what, species, TMi, TMf, SIDi, SIDf):
	species_name = Species.objects.get(id=species)
	current_time = datetime.datetime.strftime(datetime.datetime.now(), '%Y%m%d_%H%M')
	filename = "attachment; filename={0}_{1}_TM_{2:.2f}-{3:.2f}_SID_{4:.2f}-{5:.2f}_{6}.csv".format(what, species_name, TMi, TMf, SIDi, SIDf, current_time)
	return filename

@csrf_exempt
def export_nodes(request):
	if request.method == 'POST':
		data = cleanRequest(request.POST)
		dat = data['columnsnodes']
		if type(dat)!=list:
			dat = [dat]		
		columns = ['id'] + dat

		node_data = json.loads(data['nodes'])
		TMi = data['TMi']
		TMf = data['TMf']
		SIDi = data['SIDi']
		SIDf = data['SIDf']
		species = data['species'].upper()

		log_values = ['degree_log','weighted_degree_log', 'conden', 'ppi', 'length','evorate','abundance','dN','dS'] #have this read in from attributes file #cant read all cuz degree and weighted degree
		log_decimals = dict(degree_log=0, weighted_degree_log=0, conden=3, dostol=3, ppi=0, length=0, evorate=3,abundance=0,dN=3,dS=3)
 
		if data['option'] != '1':
			TMi=SIDi='0'
			TMf=SIDf='1'
       
        # Create the HttpResponse object with the appropriate CSV header.
		response = HttpResponse(content_type='text/csv')
		response['Content-Disposition'] = get_filename('NODES', species, float(TMi), float(TMf), float(SIDi), float(SIDf))

		csv_data = []	#parse those in TM/SID range?

		id_list = []
		if data['option']=='1':
			edges = Edge.objects.filter(species=species,tm__gte=TMi,tm__lte=TMf,sid__gte=SIDi,sid__lte=SIDf)
			for edge in edges:
				edge_list = edge.edgeCSV()
				id_list.extend([edge_list[0], edge_list[1]])

		for row in node_data:
			if id_list!=[]:
				if row['id'] not in id_list:
					continue
			csv_row = []
			for column in columns:
				if row[column] == None:
					csv_row.append('')
				elif column in log_values:
					csv_row.append(pow10(row[column],log_decimals[column]))
				else:
					csv_row.append(row[column])
			csv_data.append(csv_row)

		pretty_columns = []
		for col in columns:
			try:
				pretty_columns.append(better_labels[col])
			except:
				pretty_columns.append(col)

		t = loader.get_template('proteomevis/data.csv')
		response.write(t.render({'data': csv_data,'header': pretty_columns}))
		return response

@csrf_exempt
def export_edges(request):
    if request.method == 'POST':
        import os
        data = cleanRequest(request.POST)
        TMi = data['TMi']
        TMf = data['TMf']
        SIDi = data['SIDi']
        SIDf = data['SIDf']
        species = int(data['species'])


        if data['edges'] != '1':
			TMi=SIDi='0'
			TMf=SIDf='1'
        edges = Edge.objects.filter(species=species,tm__gte=TMi,tm__lte=TMf,sid__gte=SIDi,sid__lte=SIDf)
        node_data = json.loads(data['nodes'])
        if node_data!= 0:
			id_list = [node['id'] for node in node_data]
			csv_data = [edge.edgeCSV() for edge in edges if edge.edgeCSV()[0] in id_list and edge.edgeCSV()[1] in id_list]
        else:
        	csv_data = [edge.edgeCSV() for edge in edges]
        columns = edges[0].keys()

        response = HttpResponse(content_type='text/csv')	#if want to use StreamingHttpResponse need to change syntax
        response['Content-Disposition'] = get_filename('EDGES', species, float(TMi), float(TMf), float(SIDi), float(SIDf))

        t = loader.get_template('proteomevis/data.csv')	
        response.write(t.render({'data': csv_data,'header': columns}))
        return response
#        else:
 #           filename = "proteomevis/static/data_download/ALL_EDGES."+str(species)+".csv"
  #          filepath = os.path.basename(filename)
   #         chunk_size = 8192
    #        response = StreamingHttpResponse(File	Wrapper(open(filename), chunk_size),content_type='text/csv')	#have sqlite file opened here	#put need to parse by species	#just find first instance and the take all rows up until then or after that?
     #       response['Content-Length'] = os.path.getsize(filename)    
      #      response['Content-Disposition'] = "attachment; filename=%s" % filepath
       #     return response

@csrf_exempt
def export_splom(request):
    if request.method == 'POST':
        import xlwt
        data = cleanRequest(request.POST)


        TMi = data['TMi']
        TMf = data['TMf']
        SIDi = data['SIDi']
        SIDf = data['SIDf']
        column_order = json.loads(data['columnorder'])
        correlations = json.loads(data['correlations'])
        if type(correlations)!=list:
			correlations = [correlations]
        correlation_option = data['correlationoptions']
        if type(correlation_option)!=list:
			correlation_option = [correlation_option]

        columns = data['columnscorrelations']
        if type(columns)!=list:
			columns = [columns]
        
#        columns.remove('mutant')
        column_indices = [column_order.index(col) for col in columns]

        wb = xlwt.Workbook(encoding='utf-8')
        response = HttpResponse(content_type='application/ms-excel')
        response['Content-Disposition'] = get_filename('CORRELATIONS', data['species'], float(TMi), float(TMf), float(SIDi), float(SIDf))

        for corr in correlation_option:
            corr = corr.decode('utf-8', 'ignore')
            ws = wb.add_sheet(corr)
            for i,column_index in enumerate(column_indices):
                ws.write(0,i+1,label=better_labels[column_order[column_index]])
            for r, ci1 in enumerate(column_indices):
                ws.write(r+1,0,label=better_labels[column_order[ci1]])
                for c, ci2 in enumerate(column_indices):
                    ws.write(r+1,c+1,correlations[ci1][ci2][corr])

        wb.save(response)

        return response

        
        # t = loader.get_template('proteomevis/data.csv')
        # response.write(t.render({'data': csv_data,'header': columns}))
        # return response


def index(request):
    data = {}
    return render(request, "proteomevis/index.html", data)

@csrf_exempt
def fetch_edges(request):
    if request.method == 'POST':
        data = cleanRequest(request.POST)

        columns = data['columns']
        species = int(data['species'])
        TMi = data['TMi']
        TMf = data['TMf']
        SIDi = data['SIDi']
        SIDf = data['SIDf']
        include_mutants = (data['mutants'] == 'true')

        i2ID = dict()
        ID2i = dict()

        if include_mutants:
            chains = Chain.objects.filter(species=species)
            edges = Edge.objects.filter(species=species,tm__gte=TMi,tm__lte=TMf,sid__gte=SIDi,sid__lte=SIDf)[:15001]
        else: # don't include mutants, want chains and edges with mutant = 0
            chains = Chain.objects.filter(species=species,mutant=0)
            edges = Edge.objects.filter(species=species,tm__gte=TMi,tm__lte=TMf,sid__gte=SIDi,sid__lte=SIDf,mutant=0)
        edges = [(edge.targetID,edge.sourceID,edge.__dict__) for edge in edges]
        edges_ppi = filter(lambda x: x[-1]['ppi'] == 1, edges)
        if len(list(edges)) > 15000:
            response = StreamingHttpResponse(
            json.dumps(data,cls=SetEncoder),
            content_type="application/json"
            )	#StreamingHttpResponse more robust for large transfers

            response.status_code=400    #choose 400 not 404 cuz 404 automatically says file is not found (not what's goin on here)
            return response             #message called in proteome.js file

        nodes = [node.node() for node in chains]
        for i,node in enumerate(nodes):
            i2ID[i] = node[0]
            ID2i[node[0]] = i
            try:
	            nodes[ID2i[node[0]]][1]['weighted_degree'] += pow(10,nodes[ID2i[node[0]]][1]['abundance'])
            except:
	            nodes[ID2i[node[0]]][1]['weighted_degree'] = None	#weighted degree for a node that has no abundance is empty
     
        # make a temporary graph
        SG = nx.Graph()
        SG_ppi = nx.Graph()
        SG.add_nodes_from(nodes)
        SG_ppi.add_nodes_from(nodes)



        links = [dict(sourceID=source,targetID=target,source=ID2i[source],target=ID2i[target],tm=data["tm"],sid=data["sid"],ppi=data["ppi"],dashed=False) for source,target,data in edges]

        # add the edges to the graph
        SG.add_edges_from(edges)
        SG_ppi.add_edges_from(edges_ppi)

        for source, target, edge_dict in edges:	#slightly wrong, need to add abundance to itself irregardless of edge formation
            try:
                nodes[ID2i[source]][1]['weighted_degree'] += pow(10,nodes[ID2i[target]][1]['abundance'])		#this is logged!
                nodes[ID2i[target]][1]['weighted_degree'] += pow(10,nodes[ID2i[source]][1]['abundance'])
            except:
                pass

        # update the data base
        nodes = updateDegrees(SG.degree(),SG_ppi.degree(),nodes,ID2i)
        nodes = updateDegrees_log(SG.degree(),nodes,ID2i)
        # and format the clusters to pass to the client
        clusters = filter(lambda x: len(x) > 1, list(nx.connected_components(SG)))
        clusters, cluster_frequencies = getClusters(clusters,nodes,ID2i)
        nodes,clusters = addCluster(clusters,nodes,ID2i)

        correlations, limits, data = computeCorrelations(nodes, columns)
        species = Species.objects.get(id=species).toDict()

        data = {'species':species,'zero':-5,'columns':columns,'correlations':correlations,'domains':limits,'nodes':[node[1] for node in nodes],'edges':links,'clusters':clusters,'cluster_frequencies':cluster_frequencies}
        return HttpResponse(
            json.dumps(data,cls=SetEncoder),
            content_type="application/json"
        )
    else:
        return HttpResponse(
            json.dumps({"error":"Not an appropriately formatted request."},cls=SetEncoder),
            content_type="application/json"
        )

@csrf_exempt
def fetch_edge(request):
    if request.method == 'POST':
        # // TO DO //
        data = cleanRequest(request.POST)
        source = data['source']
        target = data['target']

        species = int(data['species'])
        edge = Edge.objects.get(sourceID=source,targetID=target,species=species)

        return HttpResponse(
            json.dumps(edge.__dict__,cls=SetEncoder),
            content_type="application/json"
        )
    else:
        return HttpResponse(
            json.dumps({"error":"Not an appropriately formatted request."},cls=SetEncoder),
            content_type="application/json"
        )

@csrf_exempt
def fetch_proteins(request):
    if request.method == 'POST':
        data = cleanRequest(request.POST)
        domains = data['domains']

        if not isinstance(domains,list):
            domains = [domains]

        species = Species.objects.get(id=int(data['species']))

        data = {}
        
        results = []
        chains = []

        for domain in domains:
            tmp = Domain.objects.filter(domain=domain)
            results += tmp
            
            tmp = Chain.objects.filter(domain=domain)
            chains += tmp

        keys = ['function1','function2','chains']
        if species.has_localization:
            keys.append('localizations')
            data = {result.domain:dict(domain=result.domain,function1=[],function2=set(),uniprot=[],chains=[],localizations=set()) for result in results}
        else:
            data = {result.domain:dict(domain=result.domain,function1=[],function2=set(),uniprot=[],chains=[]) for result in results}

        for e in results:
            if e.function1 not in data[e.domain]['function1']:	#could make more elaborate, see if any part in the whole #also could add chains for which function applies
	            data[e.domain]['function1'].append(e.function1)
            data[e.domain]['function2'].add(e.function2)
            data[e.domain]['uniprot'].append(dict(uniprot=e.uniprot,genes=e.genes))
            # if species.has_localization:
            #     c.execute("SELECT * FROM domain_localizations, localizations WHERE domain_localizations.uniprot = ? AND localizations.id == domain_localizations.localizationID", (uniprot,))
            #     localizations = [x[0] for x in c.fetchall()]
            #     [data[domain]['localizations'].add(x) for x in localizations]

        for chain in chains:
            try:
                data[chain.domain]
            except:
                if species.has_localization:
                    data[chain.domain] = dict(domain=chain.domain,function1=set(),function2=set(),uniprot=[],chains=[],localizations=set())
                else:
                    data[chain.domain] = dict(domain=chain.domain,function1=set(),function2=set(),uniprot=[],chains=[])
            data[chain.domain]['chains'].append(dict(chain=chain.chain,id=chain.chain_id))

        for ea in data:
            for k in keys:
                data[ea][k] = list(data[ea][k])

        # # // TO DO //
        return HttpResponse(
            json.dumps(data.values(),cls=SetEncoder),
            content_type="application/json"
        )
    else:
        return HttpResponse(
            json.dumps({"error":"Not an appropriately formatted request."},cls=SetEncoder),
            content_type="application/json"
        )

@csrf_exempt
def query(request):
    if request.method == 'GET':
        # // TO DO //
        data = cleanRequest(request.GET)
        q = data['q']
	species_chosen = int(data['species'])

        species = Species.objects.get(id=int(data['species']))

        query = "SELECT * FROM proteomevis_domain WHERE "
        query += "((uniprot LIKE '%"+q+"%') OR "
        query += "(domain LIKE '%"+q+"%') OR "
        query += "(genes LIKE '%"+q+"%') OR "
        query += "(details LIKE '%"+q+"%') OR "
        query += "(function1 LIKE '%"+q+"%') OR "
        query += "(function2 LIKE '%"+q+"%') OR "
        query += "(obsolete LIKE '%"+q+"%')) "
        query += "GROUP BY domain"
        tmp = Domain.objects.raw(query)

        data = []
        for d in list(tmp):
           R= d.__dict__
           R['_state']=0        #_state makes sure keys are unique. its value messes up calling in httpresponse
           if R['invis']==True and R['species']==species_chosen:
                data.append(R)

        return HttpResponse(
            json.dumps(data,cls=SetEncoder),
            content_type="application/json"
        )
    else:
        return HttpResponse(
            json.dumps({"error":"Not an appropriately formatted request."},cls=SetEncoder),
            content_type="application/json"
        )
