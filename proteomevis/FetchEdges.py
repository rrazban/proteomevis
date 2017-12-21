import re
from scipy.stats import linregress, spearmanr
import networkx as nx
import numpy as np
import json
import datetime
from .models import parse_pdb
import csv
#change name of FetchEdges to views_utlts

def get_filename(what, species, TMi, TMf, SIDi, SIDf):
	current_time = datetime.datetime.strftime(datetime.datetime.now(), '%Y%m%d_%H%M')
	filename = "attachment; filename={0}_{1}_TM_{2:.2f}-{3:.2f}_SID_{4:.2f}-{5:.2f}_{6}.csv".format(what, species, TMi, TMf, SIDi, SIDf, current_time)
	return filename

class SetEncoder(json.JSONEncoder):
   def default(self, obj):
      if isinstance(obj, set):
         return list(obj)
      return json.JSONEncoder.default(self, obj)

def maxNone(arr):
	tmp = filter(lambda x: not x is None, arr)
	return max(tmp)

def minNone(arr):
	tmp = filter(lambda x: (not x is None) and (x > -9.9), arr)
	return min(tmp)	

def computeCorrelations(nodes,selected_columns):
	columnDict = {}
	limits = {}
	resultsArray = []
	for column in selected_columns:
		columnDict[column] = [val[1][column] for val in nodes]
		try:
			minBound = minNone(columnDict[column])
			maxBound = maxNone(columnDict[column])
		except:
			minBound = 0 
			maxBound = 0 
		limits[column] = [minBound,maxBound]
	columnDict['names'] = [val[1]['pdb'] for val in nodes]
	for i,column1 in enumerate(selected_columns):
		resultsArray.append([])
		for j,column2 in enumerate(selected_columns):
			if i == j:
				resultsArray[i].append({'slope':1.0, 'intercept':0.0, 'r':1.0, 'p_value_PE':0.0, 'slope_err':0.0, 'rho':0, 'p_value_SP':0})
			else:
				# putting it into tuples to filter it pair-wise
				data_tupled = map(lambda x,y: (x,y),columnDict[column1],columnDict[column2])
				# eliminate any pairs that have a None value
				data_filtered = filter(lambda x: x[0] != None and x[1] != None, data_tupled)
				# unzip the tuples
				try:
					column1_data,column2_data = map(list,zip(*data_filtered))
				# linear regressions
					results = correlationJSON(column1,column1_data,column2,column2_data)
				except:
					results = {'slope':0.0, 'intercept':-1, 'r':0.0, 'p_value_PE':1.0, 'slope_err':0.0, 'rho':0, 'p_value_SP':1}
				# save it
				resultsArray[i].append(results)
	return resultsArray, limits, columnDict

def updateDegrees(deg,ppideg,nodes,ID2i):
	for e in deg:
		nodes[ID2i[e]][1]['degree'] = deg[e]	#maybe call this unlogged degree	#need unlogged degree for PCG rendering in .js
		nodes[ID2i[e]][1]['ppi_degree'] = ppideg[e]
	return nodes

def updateDegrees_log(deg,nodes,ID2i):
	for e in deg:
		if deg[e]==0:	
			nodes[ID2i[e]][1]['degree_log'] = -1
		else:	
			nodes[ID2i[e]][1]['degree_log'] = np.log10(nodes[ID2i[e]][1]['degree'])

		if nodes[ID2i[e]][1]['weighted_degree']==None:
			pass
		elif nodes[ID2i[e]][1]['weighted_degree']==0:	
			nodes[ID2i[e]][1]['weighted_degree'] = -1
		else:
			nodes[ID2i[e]][1]['weighted_degree'] = np.log10(nodes[ID2i[e]][1]['weighted_degree'])
	return nodes

def addCluster(clusters,nodes,ID2i):
	j = 0
	for i,cluster in enumerate(clusters):
		clusters[i]['id'] = i
		for cl in cluster['cluster']:
			nodes[ID2i[cl]][1]['cluster'] = i
			j += 1
	return nodes,clusters

def parse_nan(val):
	if np.isnan(val):
		return None 
	else:
		return np.asscalar(val)	#asscalar necessary to be interpreted by .js

def correlationJSON(x,xArr,y,yArr):	#why JSON added to name? call this computeCorrelation, other getCorrelation
	results = {}
	arr_corr = linregress(xArr,yArr)
	arr_sp = spearmanr(xArr,yArr)
	corr_attr = ['slope', 'intercept', 'r', 'p_value_PE', 'slope_err'] #order in which returned by linregress
	for i,attribute in enumerate(corr_attr):
		results[attribute] = parse_nan(arr_corr[i])
	for i,attribute in enumerate(['rho','p_value_SP']):
		results[attribute] = arr_sp[i]
	results['x'] = x
	results['y'] = y
	return results



def getClusters(_clusters,nodes,ID2i):
	attr = ["ppi","species","pdb","length","abundance","evorate","conden","dostol","degree_log","weighted_degree"]	#seems useful to define as a global variable in proteomevis/views.py and pass it
	unique_sizes = sorted(list(set(map(lambda x: len(x),_clusters))))
	clusters, cluster_frequencies = emptyClusters(unique_sizes,attr)
	for i,c in enumerate(_clusters):
		cluster = getClusterStats(c,nodes,attr,ID2i)
		n = cluster['size']
		cluster_frequencies[n]['frequency'] += 1
		cluster['i'] = cluster_frequencies[n]['frequency']
		for a in attr:
			cluster_frequencies[n][a] += cluster[a]
		clusters.append(cluster)
	for n in unique_sizes:
		nfreq = cluster_frequencies[n]['frequency']
		for a in attr:
			cluster_frequencies[n][a] /= nfreq
	cluster_frequencies = sorted(cluster_frequencies.values(), key=lambda k: k['size'])
	clusters = sorted(clusters, key=lambda k: k['size'],reverse=True)
	return clusters, cluster_frequencies

def getClusterStats(_cluster,nodes,attr,ID2i):
	tmp = dict(size=len(_cluster),cluster=_cluster)
	for a in attr:
		tmp[a] = average(filter(lambda x: x != None, [nodes[ID2i[x]][-1][a] for x in _cluster]))
	return tmp

def average(_list):
	try:
		a = 0 if len(_list) == 0 else float(sum(_list))/len(_list)
	except:
		a=0
	return a

def emptyClusters(unique_sizes,attr):
	cluster_frequencies = {}
	for size in unique_sizes:
		cluster_frequencies[size] = {k:0 for k in attr}
		cluster_frequencies[size]['size'] = size
		cluster_frequencies[size]['frequency'] = 0
	return [],cluster_frequencies

def pow10(n,d):
	tmp = 10**n
	format_str = "{:0."+str(d)+"f}"
	return format_str.format(tmp)

def cleanRequest(queryDict):
    cleaned_request = {}
    for qk in queryDict:
        k = re.sub("[^a-zA-Z]+", "",str(qk))
        val = queryDict.getlist(qk)
        if type(val)==list and len(val) > 1:
            cleaned_request[k] = [str(v) for v in val]
        else:
            cleaned_request[k] = str(val[0])
    return cleaned_request

class Inspect_data:
	def __init__(self, inspect_list):
		self.inspect_list = inspect_list
		self.data = {parse_pdb(inspect.pdb)[0]:dict(domain=parse_pdb(inspect.pdb)[0],function1=[],function1_chain=[],function2=[],uniprot=[],chains=[],localizations=[]) for inspect in inspect_list}
	def get_uniprot(self, pdb_complex, uniprot, genes):
		self.data[pdb_complex]['uniprot'].append(dict(uniprot=uniprot,genes=genes))

	def get_function1(self, pdb_complex, pdb_chain, function1):
		if not function1: 
			return	#null case			

		control = 2
		if not self.data[pdb_complex]['function1']:
			self.data[pdb_complex]['function1'].append(function1)
			self.data[pdb_complex]['function1_chain'].append([pdb_chain])
		else:
			for f,function in enumerate(self.data[pdb_complex]['function1']):
				if function in function1:
					self.data[pdb_complex]['function1_chain'][f].append(pdb_chain)
					control = 0
					break			
				elif function1 in function:
					self.data[pdb_complex]['function1_chain'][f].append(pdb_chain)
					control = 1	
					break
				else: pass

			if control:	#seperate to not alter the list being iterated	
				if control==1:
					self.data[pdb_complex]['function1'][f] = function1
				elif control==2:
					self.data[pdb_complex]['function1'].append(function1)
					self.data[pdb_complex]['function1_chain'].append([pdb_chain])
				else: pass

	def get_function2(self, pdb_complex, function2):
		if not self.data[pdb_complex]['function2'] and function2:
			if 'GO' in function2:
					function2 = function2[:function2.find('[GO')-1]
#			function2 = function2.split(',')
			self.data[pdb_complex]['function2'].append(function2)

	def get_localization(self, pdb_complex, localization):
		if not self.data[pdb_complex]['localizations'] and localization:
			if '{' in localization:
				localization = localization[:localization.find('{')-1]
			if ';' in localization:
				localization = localization[:localization.find(';')]
			if 'Note' in localization:
				localization = localization[:localization.find('Note')-2]
			if '.' == localization[-1]:
				localization = localization[:-1]
			self.data[pdb_complex]['localizations'] = [localization]

	def get_chains(self, pdb_list, pdb, pdb_complex, pdb_chain, pdb_id):
            if pdb_complex not in self.data:
				data[pdb_complex] = dict(domain=pdb_complex,chains=[])

            if pdb in pdb_list:			#used only for PI, Individual tab
				highlight_bool = True
            else:
				highlight_bool = False 
            self.data[pdb_complex]['chains'].append(dict(chain=pdb_chain,id=pdb_id, highlight_bool=highlight_bool))

 
	def get_data(self, has_localization, pdb_list):
		for inspect in self.inspect_list:
			pdb_complex, pdb_chain = parse_pdb(inspect.pdb)

			self.get_uniprot(pdb_complex, inspect.uniprot, inspect.genes)
			self.get_function1(pdb_complex, pdb_chain, inspect.function1)
			self.get_function2(pdb_complex, inspect.function2)
			if has_localization:
				self.get_localization(pdb_complex, inspect.location)
			self.get_chains(pdb_list, inspect.pdb, pdb_complex, pdb_chain, inspect.chain_id)

	def add_chain_to_function1(self, pdb_complex_list):	#have this done on javascript side
		for pdb_complex in pdb_complex_list:
			if len(self.data[pdb_complex]['chains'])>1:
				for f in range(len(self.data[pdb_complex]['function1'])):
					self.data[pdb_complex]['function1'][f] = '{0}: {1}'.format(', '.join(self.data[pdb_complex]['function1_chain'][f]), self.data[pdb_complex]['function1'][f])

def get_attributes():
	d={}
	filename = 'proteomevis/static/attributes/attributes.csv'	#serve through static? 
	with open(filename) as csvfile:
		reader = csv.DictReader(csvfile)
		for x in reader:
			d[x['name']] = x
	return d
