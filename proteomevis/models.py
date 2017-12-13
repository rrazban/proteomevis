from django.db import models

class Chain(models.Model):
    chain_id = models.IntegerField(default=0)
    species = models.IntegerField(default=0)
    pdb = models.CharField(max_length=10)
    uniprot = models.CharField(max_length=10,null=True)	#remove
    other_id = models.CharField(max_length=15,null=True)	#remove
    domain = models.CharField(max_length=10)
    chain = models.CharField(max_length=2)
    length = models.FloatField(blank=True,null=True)
    abundance = models.FloatField(null=True,blank=True)
  #  abundance = models.FloatField(blank=True,null=True)	#flipping order of blank and null make no diff
    evorate = models.FloatField(blank=True,null=True)
    conden = models.FloatField(blank=True,null=True)
    dostox = models.FloatField(blank=True,null=True)
    dN = models.FloatField(blank=True,null=True)
    dS = models.FloatField(blank=True,null=True)
    mutant = models.IntegerField(default=0)
    ppi = models.FloatField(null=True, blank=True)
#    hii = models.FloatField(null=True, blank=True)	#for database updating purposes

    unique_together = ("chain_id", "species")

    def __str__(self):
        return self.pdb

    def keys(self):
        return ["chain_id","ppi","species","pdb","domain","chain","uniprot","other_id","length","abundance","evorate","conden","dostox","dN","dS","mutant"]

    def stat_attr(self):
        return ["length","abundance","evorate","conden","dostox","dN","dS","weighted_degree",'weighted_degree_log','degree','degree_log','ppi_degree',"mutant"]

    def node(self):
        return (self.chain_id,{"id":self.chain_id,"species":self.species,"pdb":self.pdb,"domain":self.domain,"chain":self.chain,"length":self.length,"abundance":self.abundance,"evorate":self.evorate,"conden":self.conden,"dostol":self.dostox,"dN":self.dN,"dS":self.dS,"ppi":self.ppi,"degree":0,"degree_log":0,"weighted_degree":0,"weighted_degree_log":0,"ppi_degree":0,"mutant":self.mutant})
        # return dict(id=self.chain_id,species=self.species,pdb=self.pdb,domain=self.domain,chain=self.chain,length=self.length,abundance=self.abundance,evorate=self.evorate,conden=self.conden,dostox=self.dostox,dN=self.dN,dS=self.dS)

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
    sourceID = models.IntegerField(default=0)
    species = models.IntegerField(default=0)
    targetID = models.IntegerField(default=0)
    sid = models.FloatField(blank=True,null=True)
    tm = models.FloatField(blank=True,null=True)
    ppi = models.BooleanField(blank=True)
    mutant = models.IntegerField(default=0)

#    hii = models.FloatField(null=True, blank=True)#for database updating purposes


    def __str__(self):
        return str(self.sourceID) + " to " + str(self.targetID)

    def edge(self):
        return dict(sourceID=self.sourceID,targetID=self.targetID,sid=self.sid,tm=self.tm,ppi=self.ppi,species=self.species)

    def edgeCSV(self):
        return [self.sourceID,self.targetID,self.sid,self.tm,self.ppi,self.species,self.mutant]

    def keys(self):
        return ["sourceID","targetID","sid","tm","ppi","species","mutant"]
        # return dict(sourceID=self.sourceID,species=self.species,targetID=self.targetID,sid=self.sid,tm=self.tm,ppi=self.ppi)

class Function(models.Model):	#removed
    id = models.IntegerField(primary_key=True)
    function = models.CharField(max_length=30)

    def __str__(self):
        return self.function

class Localization(models.Model):	#removed, if I want in the future, probably easier to put in Domain file
    id = models.IntegerField(primary_key=True)
    localization = models.CharField(max_length=30)

    def __str__(self):
        return self.localization

class Species(models.Model):
    id = models.IntegerField(primary_key=True)
    name = models.CharField(max_length=30)
    has_localization = models.BooleanField()
    has_function = models.BooleanField()
    has_mutant_data = models.BooleanField(default=False)

#   hii = models.FloatField(null=True, blank=True)#for database updating purposes
    def toDict(self):
        return dict(id=self.id,name=self.name,has_localization=self.has_localization,has_function=self.has_function,has_mutant_data=self.has_mutant_data)

    def __str__(self):
        return self.name
