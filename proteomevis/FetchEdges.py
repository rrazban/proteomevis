import re
from scipy.stats import linregress, spearmanr
import networkx as nx
import numpy as np
from types import *
from math import isnan,pow
import json

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
		minBound = minNone(columnDict[column])
		maxBound = maxNone(columnDict[column])
		limits[column] = [minBound,maxBound]
	# c.execute("SELECT name FROM proteins")
	# rows = c.fetchall()
	columnDict['names'] = [val[1]['pdb'] for val in nodes]
	for i,column1 in enumerate(selected_columns):
		resultsArray.append([])
		for j,column2 in enumerate(selected_columns):
			if i == j:
				resultsArray[i].append({'slope':1.0, 'intercept':0.0, 'r_value':1.0, 'p_value':0.0, 'std_err':0.0, 'rho_SP':0, 'p_value_SP':0})
			else:
				# putting it into tuples to filter it pair-wise
				data_tupled = map(lambda x,y: (x,y),columnDict[column1],columnDict[column2])
				# eliminate any pairs that have a None value
				data_filtered = filter(lambda x: x[0] != None and x[1] != None, data_tupled)
				# unzip the tuples
				column1_data,column2_data = map(list,zip(*data_filtered))
				# linear regressions
				results = correlationJSON(column1,column1_data,column2,column2_data)
				if results['p_value_SP']==None:
					results['p_value_SP']=1
				# save it
				resultsArray[i].append(results)
	print resultsArray
	return resultsArray, limits, columnDict

def updateDegrees(deg,ppideg,nodes,ID2i):
	for e in deg:
		nodes[ID2i[e]][1]['degree'] = deg[e]
		nodes[ID2i[e]][1]['ppi_degree'] = ppideg[e]
	return nodes


def addCluster(clusters,nodes,ID2i):
	j = 0
	for i,cluster in enumerate(clusters):
		clusters[i]['id'] = i
		for cl in cluster['cluster']:
			nodes[ID2i[cl]][1]['cluster'] = i
			j += 1
	return nodes,clusters

def getAbundance(nodes,id,ID2i):
	tmp = nodes[ID2i[id]][1]['abundance']
	if tmp == None:
		tmp = 0
	return tmp

def correlationJSON(x,xArr,y,yArr):
	results = {}
	arr_corr = linregress(xArr,yArr)
	arr_sp = spearmanr(xArr,yArr)
	attributes = ['slope', 'intercept', 'r_value', 'p_value', 'std_err']
	for i,attribute in enumerate(attributes):
		tmp = np.asscalar(arr_corr[i]) if isinstance(arr_corr[i], np.float64) else arr_corr[i]
		results[attribute] = -1.0 if (np.isnan(tmp) or np.isinf(tmp)) else round(tmp,3)
	results['x'] = x
	results['y'] = y
	rho_SP = arr_sp[0]
	p_value_SP = arr_sp[1]
	if isnan(rho_SP):
		rho_SP = None
	if isnan(p_value_SP):
		p_value_SP = None
	results['rho_SP'] = rho_SP
	results['p_value_SP'] = p_value_SP

	return results

def getClusters(_clusters,nodes,ID2i):
	attr = list(nodes[0][1].keys())
	attr.remove("pdb")
	attr.remove("id")
	attr.remove("chain")
	attr.remove("domain")
	attr.remove("species")
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
	a = 0 if len(_list) == 0 else float(sum(_list))/len(_list)
	return a

def emptyClusters(unique_sizes,attr):
	cluster_frequencies = {}
	for size in unique_sizes:
		cluster_frequencies[size] = {k:0 for k in attr}
		cluster_frequencies[size]['size'] = size
		cluster_frequencies[size]['frequency'] = 0
	return [],cluster_frequencies

def pow10(n,d):
	tmp = pow(10,n)
	format_str = "{:0."+str(d)+"f}"
	return format_str.format(tmp)

def isArray(a):
	return isinstance(a,list)

def cleanRequest(queryDict):
    cleaned_request = {}
    for qk in queryDict:
        k = re.sub("[^a-zA-Z]+", "",str(qk))
        val = queryDict.getlist(qk)
        if isArray(val) and len(val) > 1:
            cleaned_request[k] = [str(v) for v in val]
        else:
            cleaned_request[k] = str(val[0])
    return cleaned_request
