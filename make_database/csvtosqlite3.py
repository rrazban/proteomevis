#!/usr/bin/python
import sys, os
import sqlite3
import csv
import pandas


column_list = ['proteomevis_species', 'proteomevis_chain', 'proteomevis_inspect', 'proteomevis_edge']

conn = sqlite3.connect("db.sqlite3")
c = conn.cursor()

for column in column_list:
#	c.execute('DROP TABLE {0}'.format(column))
	df = pandas.read_csv("make_database/{0}.csv".format(column))
	df.to_sql(column, conn)
