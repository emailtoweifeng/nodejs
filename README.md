The Taxi Prototype
==================

Run Tests!
----------

> ./mocha --ui bdd --reporter spec

To run the server (development)
-------------------------------

> PORT=YOURPORT npm start

GIT STUFF!!!
------------

### To clone the repo

> git clone git@bitbucket.org:natedude8461/taxi.git

### To create branch

> git checkout master

> git pull

> git checkout -b BRANCHNAME

### Doing work

> vi whatever.js

> git add whatever.js

> git commit -m "added some new code"

> git push origin BRANCHNAME


### When merging your branch

> git checkout master

> get pull origin BRANCHNAME

> git push origin master

### Delete remote branch

> git push origin --delete BRANCHNAME

### Delete local branch

> git checkout master

> git branch -D BRANCHNAME


### To pull Master into your branch

> git checkout branch BRANCHNAME

> git pull origin master


## Firewall Stuff

### Save current state

> sudo sh -c "iptables-save > WHATEVERFILE"

### Restore a state

> sudo sh -c "iptables-restore < WHATEVERFILE"


