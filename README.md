# proteomevis

After cloning the repository, `cd` into directory.

Run `./install.sh`, making sure any dependencies are installed.

Make the database by executing the following commands:
1) Run `python manage.py makemigrations`
2) Run `python manage.py migrate`
3) Run `make_databse/csvtosqlite3.py`
4) Open `proteomevis/models.py` and uncomment all instances of hii variable (4 instances) 
5) Run 1) and then 2) again

Run `python manage.py runserver`

In any web browser, go to [http://localhost:8000/proteomevis/](http://localhost:8000/proteomevis/ "Go to localhost")
