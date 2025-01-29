
all : small-model.js small.html

small-model.js : model.js
	cat $< | sed "s/fs = \[200,200\]/fs = \[100,100\]/g" | sed "s/Ncell = 400/Ncell = 100/g" | sed 's/zoom : 2/zoom : 3/g' > $@
	
small.html : index.html 
	cat $< | sed 's/model.js/small-model.js/g' > $@