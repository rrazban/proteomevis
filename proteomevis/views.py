from django.shortcuts import render
from django.forms.models import model_to_dict
from django.http import HttpResponse,StreamingHttpResponse
import json, tempfile, random, string,csv,datetime
from .models import *
from django.views.decorators.csrf import csrf_exempt
from .FetchEdges import *
from django.template import loader, Context
from django.core.cache import cache
from django.core.context_processors import csrf
from wsgiref.util import FileWrapper

@csrf_exempt
def export_nodes(request):
    if request.method == 'POST':
        data = cleanRequest(request.POST)

        columns = ['id'] + data['columns']
        node_data = json.loads(data['nodes'])
        TMi = data['TMi']
        TMf = data['TMf']
        SIDi = data['SIDi']
        SIDf = data['SIDf']
        species = data['species'].toUpper()

        log_values = ['evorate','abundance','dN','dS']
        log_decimals = dict(evorate=3,abundance=0,dN=3,dS=3)
        current_time = datetime.datetime.strftime(datetime.datetime.now(), '%Y%m%d_%H%M')
        
        # Create the HttpResponse object with the appropriate CSV header.
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="NODES_'+species+"_TM_"+TMi+"-"+TMf+"_SID_"+SIDi+"-"+SIDf+"_"+current_time+'.csv"'

        csv_data = []

        for row in node_data:
            csv_row = []
            for column in columns:
                if row[column] == None:
                    csv_row.append('')
                elif column in log_values:
                    csv_row.append(pow10(row[column],log_decimals[column]))
                else:
                    csv_row.append(row[column])
            csv_data.append(csv_row)

        t = loader.get_template('proteomevis/data.csv')
        response.write(t.render({'data': csv_data,'header': columns}))
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

        current_time = datetime.datetime.strftime(datetime.datetime.now(), '%Y%m%d_%H%M')
        
        if data['edges'] == '1':
            edges = Edge.objects.filter(species=species,tm__gte=TMi,tm__lte=TMf,sid__gte=SIDi,sid__lte=SIDf)
            csv_data = [edge.edgeCSV() for edge in edges]
            columns = edges[0].keys()

            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="EDGES_'+data['species']+"_TM_"+TMi+"-"+TMf+"_SID_"+SIDi+"-"+SIDf+"_"+current_time+'.csv"'

            t = loader.get_template('proteomevis/data.csv')
            response.write(t.render({'data': csv_data,'header': columns}))
            return response
        else:
            filename = "proteomevis/static/data_download/ALL_EDGES."+str(species)+".csv"
            filepath = os.path.basename(filename)
            chunk_size = 8192
            response = StreamingHttpResponse(FileWrapper(open(filename), chunk_size),content_type='text/csv')
            response['Content-Length'] = os.path.getsize(filename)    
            response['Content-Disposition'] = "attachment; filename=%s" % filepath
            return response

@csrf_exempt
def export_splom(request):
    if request.method == 'POST':
        import xlwt
        data = cleanRequest(request.POST)

        current_time = datetime.datetime.strftime(datetime.datetime.now(), '%Y%m%d_%H%M')

        TMi = data['TMi']
        TMf = data['TMf']
        SIDi = data['SIDi']
        SIDf = data['SIDf']
        column_order = json.loads(data['columnorder'])
        correlations = json.loads(data['correlations'])
        correlation_option = data['correlationoptions']

        columns = data['columns']

        column_indices = [column_order.index(col) for col in columns]

        wb = xlwt.Workbook(encoding='utf-8')
        response = HttpResponse(content_type='application/ms-excel')
        response['Content-Disposition'] = 'attachment; filename="CORRELATIONS_'+data['species']+"_TM_"+TMi+"-"+TMf+"_SID_"+SIDi+"-"+SIDf+"_"+current_time+'.xls"'

        for corr in correlation_option:
            corr = unicode(corr, "utf-8")
            ws = wb.add_sheet(corr)
            for i,column_index in enumerate(column_indices):
                ws.write(0,i+1,label=column_order[column_index])
            for r, ci1 in enumerate(column_indices):
                ws.write(r+1,0,label=column_order[ci1])
                for c, ci2 in enumerate(column_indices):
                    ws.write(r+1,c+1,label=correlations[ci1][ci2][corr])

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
            edges = Edge.objects.filter(species=species,tm__gte=TMi,tm__lte=TMf,sid__gte=SIDi,sid__lte=SIDf)
        else: # don't include mutants, want chains and edges with mutant = 0
            chains = Chain.objects.filter(species=species,mutant=0)
            edges = Edge.objects.filter(species=species,tm__gte=TMi,tm__lte=TMf,sid__gte=SIDi,sid__lte=SIDf,mutant=0)
        edges = [(edge.targetID,edge.sourceID,edge.__dict__) for edge in edges]
        edges_ppi = filter(lambda x: x[-1]['ppi'] == 1, edges)

        if len(list(edges)) > 15000:
            return HttpResponse(
                json.dumps({'errorMessage':"Too many edges selected - try a smaller area."},cls=SetEncoder),
                content_type="application/json"
            )

        nodes = [node.node() for node in chains]

        for i,node in enumerate(nodes):
            i2ID[i] = node[0]
            ID2i[node[0]] = i
        
        # make a temporary graph
        SG = nx.Graph()
        SG_ppi = nx.Graph()
        SG.add_nodes_from(nodes)
        SG_ppi.add_nodes_from(nodes)



        links = [dict(sourceID=source,targetID=target,source=ID2i[source],target=ID2i[target],tm=data["tm"],sid=data["sid"],ppi=data["ppi"],dashed=False) for source,target,data in edges]

        # add the edges to the graph
        SG.add_edges_from(edges)
        SG_ppi.add_edges_from(edges_ppi)

        for source, target, edge_dict in edges:
            try:
                nodes[ID2i[source]][1]['weighted_degree'] += nodes[ID2i[target]][1]['abundance']
            except:
                pass
            try:
                nodes[ID2i[target]][1]['weighted_degree'] += nodes[ID2i[source]][1]['abundance']
            except:
                pass

        # update the data base
        nodes = updateDegrees(SG.degree(),SG_ppi.degree(),nodes,ID2i)
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
            data = {result.domain:dict(domain=result.domain,function1=set(),function2=set(),uniprot=[],chains=[],localizations=set()) for result in results}
        else:
            data = {result.domain:dict(domain=result.domain,function1=set(),function2=set(),uniprot=[],chains=[]) for result in results}

        for e in results:
            data[e.domain]['function1'].add(e.function1)
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
            data.append(d.__dict__)

        return HttpResponse(
            json.dumps(data,cls=SetEncoder),
            content_type="application/json"
        )
    else:
        return HttpResponse(
            json.dumps({"error":"Not an appropriately formatted request."},cls=SetEncoder),
            content_type="application/json"
        )