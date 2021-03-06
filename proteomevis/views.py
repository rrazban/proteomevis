from django.shortcuts import render
from django.http import HttpResponse,StreamingHttpResponse
import json
from .models import *
from django.views.decorators.csrf import csrf_exempt
from .views_utlts import *
from django.template import loader, Context
import networkx as nx


def index(request):	#displays web page
    return render(request, "proteomevis/index.html")

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

        ID2i = dict()
        chains = Chain.objects.filter(species=species)
        edges = Edge.objects.filter(species=species,tm__gte=TMi,tm__lte=TMf,sid__gte=SIDi,sid__lte=SIDf)[:15001]
        edges = [(edge.targetID,edge.sourceID,edge.__dict__) for edge in edges]
        edges_ppi = filter(lambda x: x[-1]['ppi'] == 1, edges)
        if len(list(edges)) > 15000:
            response = StreamingHttpResponse(
            json.dumps(data,cls=SetEncoder),
            content_type="application/json"
            )	#StreamingHttpResponse more robust for large transfers

            response.status_code=400
            return response             #message called in proteome.js file

        nodes = [node.node() for node in chains]
        for i,node in enumerate(nodes):
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

        links = [dict(sourceID=source,targetID=target,source=ID2i[source],target=ID2i[target],tm=data["tm"],sid=data["sid"],align_length=data['align_length'],ppi=data["ppi"]) for source,target,data in edges]

        # add the edges to the graph
        SG.add_edges_from(edges)
        SG_ppi.add_edges_from(edges_ppi)

        for source, target, edge_dict in edges:	
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

        data = {'species':species,'columns':columns,'correlations':correlations,'domains':limits,'nodes':[node[1] for node in nodes],'edges':links,'clusters':clusters,'cluster_frequencies':cluster_frequencies}
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
def fetch_proteins(request):
    if request.method == 'POST':
        data = cleanRequest(request.POST)
        species = Species.objects.get(id=int(data['species']))
        if 'pdbcomplexlist' in data:	#for cluster
			pdb_complex_list = data['pdbcomplexlist']
			if type(pdb_complex_list)!=list: pdb_complex_list = [pdb_complex_list]
			pdb_list = []
        else:	#for clicking node, searching in PI
			pdb_list = data['pdblist']
			if type(pdb_list)!=list: pdb_list = [pdb_list]
			pdb_complex_list = []
			for pdb in pdb_list:
				pdb_complex, pdb_chain = parse_pdb(pdb)
				if pdb_complex not in pdb_complex_list:
					pdb_complex_list.append(pdb_complex)
					
        inspect_list = []
        for pdb_complex in pdb_complex_list:
			inspect_list += Inspect.objects.filter(pdb__icontains=pdb_complex)
        inspect_data = Inspect_data(inspect_list)
        inspect_data.get_data(species.has_localization, pdb_list)
        inspect_data.add_chain_to_function1(pdb_complex_list)	
        data = inspect_data.__dict__['data']

        return HttpResponse(
            json.dumps(data.values(),cls=SetEncoder),
            content_type="application/json"
        )
    else:
        return HttpResponse(
            json.dumps({"error":"Not an appropriately formatted request."},cls=SetEncoder),
            content_type="application/json"
        )

def query(request):
    if request.method == 'GET':
        data = cleanRequest(request.GET)
        q = data['q']
        query = "SELECT * FROM proteomevis_inspect WHERE "
        query += "(species = "+data['species']+") AND "
        query += "((uniprot LIKE '%"+q+"%') OR "
        query += "(pdb LIKE '%"+q+"%') OR "
        query += "(genes LIKE '%"+q+"%') OR "
        query += "(location LIKE '%"+q+"%') OR "
        query += "(function1 LIKE '%"+q+"%') OR "
        query += "(function2 LIKE '%"+q+"%')) "
        query += "GROUP BY pdb"
        tmp = Inspect.objects.raw(query)
        data = []
        for d in list(tmp):
           R = d.__dict__
           del R['_state']  #_state makes sure keys are unique. cant be passed by httpresponse
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

		attributes = get_attributes()
        # Create the HttpResponse object with the appropriate CSV header.
		if 'cluster' in node_data[0]:
			cluster_id = node_data[0]['cluster']
			pre_filename = 'cluster_{0}_'.format(cluster_id)
		else:
			pre_filename = ''

		response = HttpResponse(content_type='text/csv')
		response['Content-Disposition'] = get_filename(pre_filename, 'NODES', Species.objects.get(id=species), float(TMi), float(TMf), float(SIDi), float(SIDf))

		csv_data = []
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
				elif column in attributes:
					if attributes[column]['log']=='1':
						csv_row.append(format(10**row[column], '.{0}f'.format(attributes[column]['decimal'])))
				else:
					csv_row.append(row[column])
			csv_data.append(csv_row)

		pretty_columns = []
		for col in columns:
			if col in attributes:
				pretty_columns.append(col)
			else:
				pretty_columns.append(col)

		t = loader.get_template('proteomevis/data.csv')
		response.write(t.render({'data': csv_data,'header': pretty_columns}))
		return response

def export_edges(request):
    if request.method == 'POST':
        data = cleanRequest(request.POST)
        TMi = data['TMi']
        TMf = data['TMf']
        SIDi = data['SIDi']
        SIDf = data['SIDf']
        species = int(data['species'])

        if data['edges'] == '2':
			TMi=SIDi='0'
			TMf=SIDf='1'
        edges = Edge.objects.filter(species=species,tm__gte=TMi,tm__lte=TMf,sid__gte=SIDi,sid__lte=SIDf)
        node_data = json.loads(data['nodes'])
        if node_data!= 0:
			id_list = [node['id'] for node in node_data]
			cluster_id = node_data[0]['cluster']	#all nodes have the same cluster_id 
			csv_data = [edge.edgeCSV() for edge in edges if edge.edgeCSV()[0] in id_list and edge.edgeCSV()[1] in id_list]
			pre_filename = 'cluster_{0}_'.format(cluster_id)
        else:
			csv_data = [edge.edgeCSV() for edge in edges]
			pre_filename = ''
        columns = edge.keys()

        response = HttpResponse(content_type='text/csv')	#to use StreamingHttpResponse, need to change syntax
        response['Content-Disposition'] = get_filename(pre_filename, 'EDGES', Species.objects.get(id=species), float(TMi), float(TMf), float(SIDi), float(SIDf))

        t = loader.get_template('proteomevis/data.csv')	
        response.write(t.render({'data': csv_data,'header': columns}))
        return response

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
        attributes = get_attributes()
        column_indices = [column_order.index(col) for col in columns]

        wb = xlwt.Workbook(encoding='utf-8')
        response = HttpResponse(content_type='application/ms-excel')
        response['Content-Disposition'] = get_filename('', 'CORRELATIONS', Species.objects.get(id=int(data['species'])), float(TMi), float(TMf), float(SIDi), float(SIDf))

        for corr in correlation_option:
            corr = corr.decode('utf-8', 'ignore')
            ws = wb.add_sheet(corr)
            for i,column_index in enumerate(column_indices):
                ws.write(0,i+1,label=column_order[column_index])
            for r, ci1 in enumerate(column_indices):
                ws.write(r+1,0,label=column_order[ci1])
                for c, ci2 in enumerate(column_indices):
                    ws.write(r+1,c+1,correlations[ci1][ci2][corr])

        wb.save(response)
        return response
