from django.db import models

class Chain(models.Model):
    chain_id = models.IntegerField(default=0)
    species = models.IntegerField(default=0)
    pdb = models.CharField(max_length=10)
    domain = models.CharField(max_length=10)
    chain = models.CharField(max_length=2)
    length = models.FloatField(blank=True,null=True)
    abundance = models.FloatField(blank=True,null=True)	
    evorate = models.FloatField(blank=True,null=True)
    conden = models.FloatField(blank=True,null=True)
    dostox = models.FloatField(blank=True,null=True)
    ppi = models.FloatField(null=True, blank=True)

    unique_together = ("chain_id", "species")

    def __str__(self):
        return self.pdb

    def keys(self):
        return ["chain_id","ppi","species","pdb","domain","chain","length","abundance","evorate","conden","dostox"]

    def stat_attr(self):
        return ["length","abundance","evorate","conden","dostox","weighted_degree",'weighted_degree_log','degree','degree_log','ppi_degree']

    def node(self):
        return (self.chain_id,{"id":self.chain_id,"species":self.species,"pdb":self.pdb,"domain":self.domain,"chain":self.chain,"length":self.length,"abundance":self.abundance,"evorate":self.evorate,"conden":self.conden,"dostol":self.dostox,"ppi":self.ppi,"degree":0,"degree_log":0,"weighted_degree":0,"weighted_degree_log":0,"ppi_degree":0})


class Inspect(models.Model):
    id = models.IntegerField(primary_key=True)
    pdb = models.CharField(max_length=10,blank=True,null=True)
    uniprot = models.CharField(max_length=30,blank=True,null=True)
    genes = models.CharField(max_length=30,blank=True,null=True)
    location = models.CharField(max_length=200,blank=True,null=True)
    function1 = models.CharField(max_length=200,blank=True,null=True)
    function2 = models.CharField(max_length=30,blank=True,null=True)
    species = models.IntegerField(default=0,blank=True,null=True)

    def __str__(self):
        return self.pdb

    def parse_pdb(self):
		pdb = self.pdb
		pdb_complex = pdb[:pdb.index('.')].upper()
		pdb_chain = pdb[pdb.index('.')+1:]
		return pdb_complex, pdb_chain	


class Edge(models.Model):
    species = models.IntegerField(default=0)
    sourceID = models.IntegerField(default=0)
    targetID = models.IntegerField(default=0)
    sid = models.FloatField(blank=True,null=True)
    tm = models.FloatField(blank=True,null=True)
    ppi = models.BooleanField(blank=True)

    def __str__(self):
        return str(self.sourceID) + " to " + str(self.targetID)

    def edge(self):
        return dict(sourceID=self.sourceID,targetID=self.targetID,sid=self.sid,tm=self.tm,ppi=self.ppi,species=self.species)

    def edgeCSV(self):
        return [self.sourceID,self.targetID,self.sid,self.tm,self.ppi,self.species]

    def keys(self):
        return ["sourceID","targetID","sid","tm","ppi","species"]


class Species(models.Model):
    id = models.IntegerField(primary_key=True)
    name = models.CharField(max_length=30)
    has_localization = models.BooleanField()

    def toDict(self):
        return dict(id=self.id,name=self.name,has_localization=self.has_localization)

    def __str__(self):
        return self.name
