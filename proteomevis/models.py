from django.db import models

class Chain(models.Model):
    chain_id = models.IntegerField(default=0)
    species = models.IntegerField(default=0)
    pdb = models.CharField(max_length=10)
    uniprot = models.CharField(max_length=10,null=True)
    other_id = models.CharField(max_length=15,null=True)
    domain = models.CharField(max_length=10)
    chain = models.CharField(max_length=2)
    length = models.FloatField(blank=True,null=True)
    abundance = models.FloatField(blank=True,null=True)
    evorate = models.FloatField(blank=True,null=True)
    conden = models.FloatField(blank=True,null=True)
    dostox = models.FloatField(blank=True,null=True)
    dN = models.FloatField(blank=True,null=True)
    dS = models.FloatField(blank=True,null=True)
    mutant = models.IntegerField(default=0)

    unique_together = ("chain_id", "species")

    def __str__(self):
        return self.pdb

    def keys(self):
        return ["chain_id","species","pdb","domain","chain","uniprot","other_id","length","abundance","evorate","conden","dostox","dN","dS","mutant"]

    def stat_attr(self):
        return ["length","abundance","evorate","conden","dostox","dN","dS","weighted_degree",'degree','ppi_degree',"mutant"]

    def node(self):
        return (self.chain_id,{"id":self.chain_id,"species":self.species,"pdb":self.pdb,"domain":self.domain,"chain":self.chain,"length":self.length,"abundance":self.abundance,"evorate":self.evorate,"conden":self.conden,"dostol":self.dostox,"dN":self.dN,"dS":self.dS,"degree":0,"weighted_degree":0,"ppi_degree":0,"mutant":self.mutant})
        # return dict(id=self.chain_id,species=self.species,pdb=self.pdb,domain=self.domain,chain=self.chain,length=self.length,abundance=self.abundance,evorate=self.evorate,conden=self.conden,dostox=self.dostox,dN=self.dN,dS=self.dS)

class DomainLocalization(models.Model):
    uniprot = models.CharField(max_length=10)
    localizationID = models.IntegerField()

    def __str__(self):
        return self.uniprot
        # return dict(uniprot=self.uniprot,localizationID=lself.ocalizationID)

class Domain(models.Model):
    id = models.IntegerField(primary_key=True)
    domain = models.CharField(max_length=10,blank=True,null=True)
    uniprot = models.CharField(max_length=30,blank=True,null=True)
    genes = models.CharField(max_length=30,blank=True,null=True)
    details = models.CharField(max_length=200,blank=True,null=True)
    function1 = models.CharField(max_length=200,blank=True,null=True)
    function2 = models.CharField(max_length=30,blank=True,null=True)
    invis = models.BooleanField(blank=True)
    obsolete = models.CharField(max_length=30,blank=True,null=True)
    species = models.IntegerField(default=0,blank=True,null=True)

    def __str__(self):
        return self.domain
        # return dict(id=self.id,domain=self.domain,uniprot=self.uniprot,genes=self.genes,details=self.details,function1=self.function1,function2=self.function2,invis=self.invis,obsolete=self.obsolete,species=self.species)

class Edge(models.Model):
    sourceID = models.IntegerField(default=0)
    species = models.IntegerField(default=0)
    targetID = models.IntegerField(default=0)
    sid = models.FloatField(blank=True,null=True)
    tm = models.FloatField(blank=True,null=True)
    ppi = models.BooleanField(blank=True)
    mutant = models.IntegerField(default=0)

    def __str__(self):
        return str(self.sourceID) + " to " + str(self.targetID)

    def edge(self):
        return dict(sourceID=self.sourceID,targetID=self.targetID,sid=self.sid,tm=self.tm,ppi=self.ppi,species=self.species)

    def edgeCSV(self):
        return [self.sourceID,self.targetID,self.sid,self.tm,self.ppi,self.species,self.mutant]

    def keys(self):
        return ["sourceID","targetID","sid","tm","ppi","species","mutant"]
        # return dict(sourceID=self.sourceID,species=self.species,targetID=self.targetID,sid=self.sid,tm=self.tm,ppi=self.ppi)

class Function(models.Model):
    id = models.IntegerField(primary_key=True)
    function = models.CharField(max_length=30)

    def __str__(self):
        return self.function

class Localization(models.Model):
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

    def toDict(self):
        return dict(id=self.id,name=self.name,has_localization=self.has_localization,has_function=self.has_function,has_mutant_data=self.has_mutant_data)

    def __str__(self):
        return self.name
