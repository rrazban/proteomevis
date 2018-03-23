# ProteomeVis

ProteomeVis is a web app for visualizing protein properties from structure to sequence and from individual protein to its effect in the cell. The web app is written in the Django web framework. 

To deploy the web app locally as seen publicly at [http://proteomevis.chem.harvard.edu](http://proteomevis.chem.harvard.edu) :

1. `./install.sh`
	* installs Python dependencies
2. `make_database/csvtosqlite3.py`
	* makes db.sqlite3 from the .csv files in `make_database/`
		* to create your own unique database, change the contents of the csv files
3. `python manage.py runserver`
	* starts development server
4. Go to [http://localhost:8000/proteomevis/](http://localhost:8000/proteomevis/)

To learn how the .csv files in `make_database/` are generated, check out [this](https://github.com/rrazban/proteomevis_scripts) GitHub repository
