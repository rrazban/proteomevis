from django.db import models


def parse_pdb(pdb):
	pdb_complex = pdb[:pdb.index('.')]
	pdb_chain = pdb[pdb.index('.')+1:]
	return pdb_complex, pdb_chain	

class Chain(models.Model):
    chain_id = models.IntegerField(primary_key=True)
    species = models.IntegerField(default=0)
    pdb = models.CharField(max_length=10)
    length = models.FloatField(blank=True,null=True)
    abundance = models.FloatField(blank=True,null=True)	
    evolutionary_rate = models.FloatField(blank=True,null=True)
    contact_density = models.FloatField(blank=True,null=True)
    dosage_tolerance = models.FloatField(blank=True,null=True)
    PPI_degree = models.FloatField(null=True, blank=True)

    def __str__(self):
        return self.pdb

    def node(self):
        pdb_complex, pdb_chain = parse_pdb(self.pdb)
        return (self.chain_id,{"id":self.chain_id,"species":self.species,"pdb":self.pdb,"pdb_complex":pdb_complex,"chain":pdb_chain,"length":self.length,"abundance":self.abundance,"evolutionary_rate":self.evolutionary_rate,"contact_density":self.contact_density,"dosage_tolerance":self.dosage_tolerance,"PPI_degree":self.PPI_degree,"degree":0,"weighted_degree":0,"ppi":0})


class Inspect(models.Model):
    chain_id = models.IntegerField(primary_key=True)
    pdb = models.CharField(max_length=10,blank=True,null=True)
    uniprot = models.CharField(max_length=30,blank=True,null=True)
    genes = models.CharField(max_length=30,blank=True,null=True)
    location = models.CharField(max_length=200,blank=True,null=True)
    function1 = models.CharField(max_length=200,blank=True,null=True)
    function2 = models.CharField(max_length=30,blank=True,null=True)
    species = models.IntegerField(default=0,blank=True,null=True)

    def __str__(self):
        return self.pdb


class Edge(models.Model):
    species = models.IntegerField(default=0)
    sourceID = models.IntegerField(default=0)
    targetID = models.IntegerField(default=0)
    sid = models.FloatField(blank=True,null=True)
    tm = models.FloatField(blank=True,null=True)
    ppi = models.BooleanField(blank=True)

    def __str__(self):
        return str(self.sourceID) + " to " + str(self.targetID)

    def edgeCSV(self):
        return [self.sourceID,self.targetID,self.sid,self.tm,self.ppi]
    def keys(self):	#matches edgeCSV
        return ["sourceID","targetID","sid","tm","ppi"]


class Species(models.Model):
    id = models.IntegerField(primary_key=True)
    name = models.CharField(max_length=30)
    has_localization = models.BooleanField()	#remove? all organisms have localization to some extent

    def toDict(self):
        return dict(id=self.id,name=self.name,has_localization=self.has_localization)

    def __str__(self):
        return self.name
