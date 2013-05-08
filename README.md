Registry-RI
===========

FI-WARE Platform Registry Implementation

Registry API Core
-----------------

The Registry API is a RESTful, resource-oriented API accessed via HTTP that uses various representations for information interchange. The  Registry Enabler is used to store information on service instances necessary for run-time execution.

Intended Audience
-----------------

This specification is intended for both software developers and implementers of the FI-WARE Business Framework. For the former, this document provides a full specification of how to interoperate with products that implement the Repository API. For the latter, this specification indicates the interface to be implemented and provided to clients. Software developers intending to build applications on top of FI-WARE Enablers will implement a client of the interface specification. Implementers of the GE will implement a service of the interface specification.

To use this information, the reader should firstly have a general understanding of the Generic Enabler service [[FIWARE.ArchitectureDescription.Apps.Registry | Registry Enabler]]. You should also be familiar with:
* RESTful web services
* HTTP/1.1
* JSON and/or XML data serialization formats.
* LDAP

API Change History
------------------
  
This version of the Registry API Guide replaces and obsoletes all previous versions.


How to Read This Document
-------------------------
It is assumed that the reader is familiar with the REST architecture style. Within the document, some special notations are applied to differentiate some special words or concepts. The following list summarizes these special notations.
* A bold, mono-spaced font is used to represent code or logical entities, e.g., HTTP method (<code>GET, PUT, POST, DELETE</code>). 
* An italic font is used to represent document titles or some other kind of special text, e.g., ''URI''.
* Variables are represented between brackets, e.g. {id} and in italic font. The reader can replace the id with an appropriate value. 

For a description of some terms used along this document, see [[FIWARE.ArchitectureDescription.Apps.Registry | Registry Enabler]].

Additional Resources
--------------------

You can download the most current version of this document from the FI-WARE API specification website at [[FIWARE.OpenSpecification.Apps.RegistryREST | Registry API ]]. For more details about the Registry GE that this API is based upon, please refer to the [[FIWARE.ArchitectureDescription.Apps.Registry | High Level Description]]. Related documents, including an Architectural Description, are available at the same site.

General ''Registry''  API Information
=====================================

Resources Summary
-----------------
The registry is structured into core objects, which are called ''registry entries''. These objects constitute also the granularity of access control. A registry entry, uniquely identified by its ''distinguished name'', can hold a number of ''attributes''.

Authentication
--------------

Each HTTP request against the ''Registry GE'' requires the inclusion of specific authentication credentials. The specific implementation of this API may support multiple authentication schemes (OAuth, Basic Auth, Token) and will be determined by the specific provider that implements the GE. Please contact with it to determine the best way to authenticate against this API. Some authentication schemes may require that the API operate using SSL over HTTP (HTTPS).

Authorization
-------------

It is assumed that access to the registry is controlled by a authorization mechanisms in order to ensure that only authorized clients can read/modify/write specific information. The specification of a concrete authorization mechanism is out of scope for this document. Within the FI-WARE testbed, the authorization methods of the Security Chapter enablers will be supported by the Registry implementation.

Representation Format
---------------------
 
The ''Registry'' API supports XML/RDF, Turtle, JSON, Atom HTML for delivering information for registry entries. The request format is specified using the Content-Type header and is required for operations that have a request body. The response format can be specified in requests using the Accept header. Note that it is possible for a response to be serialized using a format different from the request (see example below).

If no Content-Type is specified, the content is delivered in the format that was chosen to upload the resource.

The interfaces should support data exchange through multiple formats:

{{Mime-type|text/plain | A linefeed separated list of elements for easy mashup and scripting.}}
{{Mime-type|text/html | An human-readable HTML rendering of the results of the operation as output format. }}
{{Mime-type|application/json | A JSON representation of the input and output for mashups or JavaScript-based Web Apps}}
{{Mime-type|application/rdf+xml | A RDF description of the input and output.}}

In a concrete implementation of this GE other formats like RSS, Atom, etc. may also be possible.

Representation Transport
------------------------

Resource representation is transmitted between client and server by using HTTP 1.1 protocol, as defined by IETF RFC-2616. Each time an HTTP request contains payload, a Content-Type header shall be used to specify the MIME type of wrapped representation. In addition, both client and server may use as many HTTP headers as they consider necessary.

Resource Identification
-----------------------

The Distinguished Entry Name (DEN) is used to unambiguously identify registry entries. In analogy to the LDAP protocol (RFCs 4510,4512,4514,4516,4517) we assume distinguished entry names can be expressed in a hierarchical way. 

Example:

''/c=de/o=University%20of%20Michigan'' - is a DEN similar to an LDAP DN

''/de/University%20of%20Michigan'' - is an alternative representation of the DEN assuming that there is a default hierarchy


Web citizen
-----------

The registry is relying on Web principles:
* URI to identify resources
* consistent URI structure based on REST style protocol
* HTTP content negotiation to allow the client to choose the appropriate data format supporting HTML, RDF, XML, RSS, JSON, Turtle, ...
* Human readable output format using HTML rendering ('text/html' accept header) including hyperlinked representation
* Use of HTTP response codes including ETags (proper caching)
* Linked Data enablement supporting RDF input and output types

Paginated Collections
---------------------
In order to reduce the load on the service, we can decide to limit the number of elements to return when it is too big. This section explain how to do that using for example a limit parameter (optional) and a last parameter (optional) to express which is the maximum number of element to return and which was the last element to see.

These operations will have to cope with the possibility to have over limit fault (413) or item not found fault (404).

Limits
------
We can manage the capacity of the system in order to prevent the abuse of the system through some limitations. These limitations will be configured by the operator and may differ from one implementation to other of the GE implementation.

Rate Limits

These limits are specified both in human readable wild-card and in regular expressions and will indicate for each HTTP verb which will be the maximum number of operations per time unit that a user can request. After each unit time the counter is initialized again.	
In the event a request exceeds the thresholds established for your account, a 413 HTTP response will be returned with a Retry-After header to notify the client when they can attempt to try again.

Extensions
----------

The Registry could be extended in the future. At the moment, we foresee the following resource to indicate a method that will be used in order to allow the extensibility of the API. This allow the introduction of new features in the API without requiring an update of the version, for instance, or to allow the introduction of vendor specific functionality.

{| border="1" cellpadding="2"
|-
||'''Verb'''||'''URI'''||'''Description'''
|-
||GET ||/extensions||List of all available extensions
|}


Faults
------
Synchronous Faults

Error codes are returned in the body of the response. The description section returns a human-readable message for displaing end users.  

Example: 

<pre>
<exception>
	<description>Resource Not found</description>
	<errorCode>404</errorCode>
	<reasonPhrase>Not Found</reasonPhrase>
</exception>
</pre>

{| border="1" cellpadding="2"
|-
||'''Fault Element'''||'''Associated Error Codes'''||'''Expected in All Requests?'''
|-
||Unauthorized||403||YES
|-
||Not Found||404||YES
|-
||Limit Fault||413||YES
|-
||Internal Server error||50X||YES
|-
|}

API Operations
==============

Retrieving Registry Information
===============================

Read registry entry
-------------------

Here we start with the description of the operation following the next table:
{| style="border-collapse: collapse; border-width: 1px; border-style: solid; border-color: #000"
|-
! style="border-style: solid; border-width: 1px"| Verb
! style="border-style: solid; border-width: 1px"| URI
! style="border-style: solid; border-width: 1px"| Description
|-
| style="border-style: solid; border-width: 1px"| GET
| style="border-style: solid; border-width: 1px"| /{DistinguishedEntryName}?
{FilterParameters}&attributes={AttributeList}
| style="border-style: solid; border-width: 1px"| Get registry entry information:
|-
|}

Parameters

''FilterParameters'' - Expression for filtering registered entries according to its property values. A filter expression is given as URL query parameters.

''AttributeList'' - Comma-separated list of attribute names which should be returned.

Example

GET /de/service/stores/?attributes=Name,serviceResource,endpoint

Returns the name, service description URL, and service endpoint URL for all services registered under "/de/service/stores".

Result Format

Accept: application/json:

<pre>
[ { DEN: "/de/service/stores/store1",
    Name: "Store1 Name",
    service: "http://fiware.org/usdl/servicestorexyz",
    endpoint: "http://fiware-platform.org/service/store1/instance4711"
  },
  ...
]
</pre>

Status Codes

200 OK
:The request was handled successfully and transmitted in response message.

400 Bad Request
:The request cannot be fulfilled due to bad syntax.

404 Not Found
:The requested resource could not be found but may be available again in the future. Subsequent requests by the client are permissible.

500 Internal Server Error
:A generic error message, given when no more specific message is suitable.

Modifying Entries
=================

Creating and Updating
---------------------

{| style="border-collapse: collapse; border-width: 1px; border-style: solid; border-color: #000"
|-
! style="border-style: solid; border-width: 1px"| Verb
! style="border-style: solid; border-width: 1px"| URI
! style="border-style: solid; border-width: 1px"| Description
|-
| style="border-style: solid; border-width: 1px"| PUT
| style="border-style: solid; border-width: 1px"| /{DistinuguishedEntryName}
| style="border-style: solid; border-width: 1px"| Create or update a resource or a number of resources
|-
|}

Request Body

The request body of a PUT operation should contain the set of attributes of the entry. E.g. if Content-type was "application/json":

<pre>
{
  "{attributeName1}": "AttributeValue1",
  "{attributeName2}": "AttributeValue2",
  ...
}
</pre>
or for a number of resources
<pre>
[{
  "RDN": "{RelativeDistinguishedName",
  "{attributeName1}": "AttributeValue1",
  "{attributeName2}": "AttributeValue2",
  ...
 },
 ...
]
</pre>
respectively.

Status Codes

201 Created
:The request has been fulfilled and resulted in a new resource being created.

204 No Content
:The server successfully processed the request, but is not returning any content.

400 Bad Request
:The request cannot be fulfilled due to bad syntax.

404 Not Found
:The requested resource could not be found but may be available again in the future. Subsequent requests by the client are permissible.

409 Conflict
:Indicates that the request could not be processed because of conflict in the request, such as an edit conflict.

500 Internal Server Error
:A generic error message, given when no more specific message is suitable.



Adding Information
------------------

{| style="border-collapse: collapse; border-width: 1px; border-style: solid; border-color: #000"
|-
! style="border-style: solid; border-width: 1px"| Verb
! style="border-style: solid; border-width: 1px"| URI
! style="border-style: solid; border-width: 1px"| Description
|-
| style="border-style: solid; border-width: 1px"| POST
| style="border-style: solid; border-width: 1px"| /{DistinguishedEntryName}
| style="border-style: solid; border-width: 1px"| Add attributes to a registry entry
|-
|}

Request Body

The request body contains the attributes to be added to an entry:

<pre>
{
  "{attributeName1}": "AttributeValue1",
  "{attributeName2}": "AttributeValue2",
  ...
}
</pre>

Status Codes

201 Created
:The request has been fulfilled and resulted in a new resource being created.

204 No Content
:The server successfully processed the request, but is not returning any content.

400 Bad Request
:The request cannot be fulfilled due to bad syntax.

404 Not Found
:The requested resource could not be found but may be available again in the future. Subsequent requests by the client are permissible.

409 Conflict
:Indicates that the request could not be processed because of conflict in the request, such as an edit conflict.

500 Internal Server Error
:A generic error message, given when no more specific message is suitable.

Deleting Registry Information
=============================

Deleting Entries
----------------

{| style="border-collapse: collapse; border-width: 1px; border-style: solid; border-color: #000"
|-
! style="border-style: solid; border-width: 1px"| Verb
! style="border-style: solid; border-width: 1px"| URI
! style="border-style: solid; border-width: 1px"| Description
|-
| style="border-style: solid; border-width: 1px"| DELETE
| style="border-style: solid; border-width: 1px"| /{DistinuguishedEntryName}
| style="border-style: solid; border-width: 1px"| Delete a registry entry
|-
|}

Status Codes
200 OK
:The request was handled successfully and transmitted in response message.

400 Bad Request
:The request cannot be fulfilled due to bad syntax.

404 Not Found
:The requested resource could not be found but may be available again in the future. Subsequent requests by the client are permissible.

500 Internal Server Error
:A generic error message, given when no more specific message is suitable.

Delete Attributes of an Entry
-----------------------------

{| style="border-collapse: collapse; border-width: 1px; border-style: solid; border-color: #000"
|-
! style="border-style: solid; border-width: 1px"| Verb
! style="border-style: solid; border-width: 1px"| URI
! style="border-style: solid; border-width: 1px"| Description
|-
| style="border-style: solid; border-width: 1px"| DELETE
| style="border-style: solid; border-width: 1px"| /{DistinguishedEntryName}?attributes={AttributeNames}
| style="border-style: solid; border-width: 1px"| Delete attributes of a registry entry
|-
|}

Parameters

{AttributeNames} contains a comma-separated list of attribute names to be deleted from the entry.

Status Codes

200 OK
:The request was handled successfully and transmitted in response message.

400 Bad Request
:The request cannot be fulfilled due to bad syntax.

404 Not Found
:The requested resource could not be found but may be available again in the future. Subsequent requests by the client are permissible.

500 Internal Server Error
:A generic error message, given when no more specific message is suitable.
