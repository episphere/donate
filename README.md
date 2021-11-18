# Donate
Minimum token based web-stack infrastructure (server-side, nodejs) for data donation.

* A test live deployment, with all constructs and files exposed for public inspection, is provided at https://replit.com/@jonasalmeida/donate. 

* A small test client library for get and post data donations is also served here, at https://episphere.github.io/donate.

* For an example of a client web application that engages a web service (fitbit and Google fit) on behalf fo the user authenticated and authorized via scoped oauth2 see https://github.com/episphere/wearable.

**Design notes** - the consumer-facing engagement of cohort participants in epidemiological studies is challenged with very stringent concerns about the chain of custody of the donated data. The two key design features appear to be that authorized user credentials (oauth2's bearer token) are never circulated to server-side components; and the donation tokens are issued and are exclusively kept by the donation server-side recipient service. The satisfaction of these two design criteria was satisfied by a workflow that starts with the issue of a donation token to the client application (email with application url with embedded donnation token), where the data doner can automatically extract user-governed data from the consumer-facing data service, and have the corresponding donated data contributed back to the token issuer directly (no proxying, no exchange of authorized bearer tokens).

**Implementation notes** - the modern web stack has evolved to support consumer-facing execution models. Specifically, the web computing engine ([V8 engine](https://en.wikipedia.org/wiki/V8_(JavaScript_engine))) is now [dominant both in the client and server (nodejs) side of consumer-facing data infrastructure](http://www.modulecounts.com). As a consequence, the same code base can now run in both client and server sides of the development stack. This represents a particular challenge to IT units in biomedical informatics environments, where technology adoption is tied to the preservation of veted legacy infrastructure.


---------------
## Serverless implementation using Cloud Function and Cloud Storage
API documentation - https://documenter.getpostman.com/view/7490604/UVCCf44Q
