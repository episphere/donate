# Donate
### Live at https://episphere.github.io/donate
Minimum token based web-stack infrastructure (server-side, nodejs) for data donation.

* A test live deployment, with all constructs and files exposed for public inspection, is provided at https://replit.com/@jonasalmeida/donate. 

* A small test client library for get and post data donations is also automatically served at https://episphere.github.io/donate.

* See also the reference [SDK documentation](https://github.com/episphere/donate/wiki) and webcast [YouTube tutorials](https://www.youtube.com/playlist?list=PLkL13FANCVB1APOiA8IQm18hKAstGpKNV).

* A detailed manuscript has been submitted for peer-reviewed publication ... 

**Design notes** - the consumer-facing engagement of cohort participants in epidemiological studies is challenged with very stringent concerns about the chain of custody of the donated data. The two key design features appear to be that authorized user credentials (oauth2's bearer token) are never circulated to server-side components; and the donation tokens are issued and are exclusively kept by the donation server-side recipient service. The satisfaction of these two design criteria was adressed by a workflow that starts with the issue of a donation token to the client application (email with application url with embedded donnation token), where the data doner can automatically extract user-governed data from the consumer-facing data service, and have the corresponding donated data contributed back to the token issuer directly (no proxying, no exchange of authorized bearer tokens).

**Implementation notes** - the modern web stack has evolved to support consumer-facing execution models. Specifically, the web computing engine ([V8 engine](https://en.wikipedia.org/wiki/V8_(JavaScript_engine))) is now [dominant both in the client and server (nodejs) side of consumer-facing data infrastructure](http://www.modulecounts.com). As a consequence, the same code base can now run in both client and server sides of the development stack. This move to serverless execution deployment benefits from advances in cloud computing, particularly those evolving towards edge computation such as [Cloud Flare workers](https://cloudflareworkers.com). However, this may represent a particular challenge to IT units in biomedical informatics environments, where technology adoption is conditined by the use of legacy infrastructure. In that case, the reference implementation provided in *Repl.It* can be deployed as as a regular nodejs service, either on prem, containarized or in cloud application environments such as [heroku](https://www.heroku.com) and [digital ocean](https://www.digitalocean.com).

**Disclaimer** - the commercial services mentioned above reflect the technology exposure of the developers, and should in now way be taken as endorsement. Furthermore, the developers of epiDonate declare not having any private engagement with those commercial services, or any other conflict of interrest.
