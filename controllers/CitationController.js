"use strict";
var ArticleModel = require("../models/ArticleModel"),
	request = require("request"),
	XmlDocument = require("xmldoc").XmlDocument,
	ObjectId = require("mongoose").Types.ObjectId,
	_ = require("underscore"),
	//eutilsXmlParse = require("../../data-pipeline/eutils_xml_parse"),
	err = new Error;


var ignorePmid = [];

var seedPmidObjectId;
var pmid;

var CitationController = function(){

	
};

CitationController.prototype.getPmid = function(ignorePmid, callback){// get citations for existing articles in database

	this.ignorePmid = ignorePmid;
	//console.log("ignore these values:"+ this.ignorePmid);
	/**
		get the pmid of a document where is_ref_of is 0 and where the title exists.
		this prevents citations and references already collected being picked up for processing.

	*/
	//$nin: [24563719, 24672386, 25029550, 0] 
	
	ArticleModel.findOne({title:{$exists: true}, citation_count:{$exists:false}, pmid:{$nin: ignorePmid}}, "pmid", function(err, results){
		if(err){
			callback(null, err);
		}else{
		
		pmid = results["pmid"]
		seedPmidObjectId = results["_id"]
		callback(null, results);
	}
	});
	
};

CitationController.prototype.fetchCitations = function(pmid, callback){

		this.callback = callback;

		var options = {
			url: "http://eutils.ncbi.nlm.nih.gov/entrez/eutils/elink.fcgi?",
			qs : {
				dbfrom : "pubmed",
				db: "pubmed",
				id: pmid,
				email: "robertjsullivan.esq@gmail.com",
				project:"ccbrowser"
			}
			

		};
		
		
		request(options, function(err, response, body){
			if(err){
				callback(err);
			}else{
				callback(null, response)
			}
		})


	
};


CitationController.prototype.citationsExist = function(data, callback){

	this.data = data;

	var jsXml = new XmlDocument(this.data);

	var linkSet = jsXml.childNamed("LinkSet");

	var citeCheck = false;
	var citingPmids;

	//check each link set db if it matches pubmed_pubmed_refs
	linkSet.eachChild(function(linkSetDb){

		if(linkSetDb.valueWithPath("LinkName") == "pubmed_pubmed_citedin"){
			citeCheck = true;
			citingPmids = linkSetDb;

		}

	});
	if(citeCheck == false){
		ignorePmid.push(this.pmid)
	}

	callback(null, citeCheck, citingPmids);//is this callback ever called before eachChild finishes? 

		
};


CitationController.prototype.parseResponse = function(citationLinkSet, callback){

	this.data = citationLinkSet.childrenNamed("Link");//returns an array of objects
	var pmids = [];
	for(var i =0, l = this.data.length; i < l; i++){
		var pmid = parseInt(this.data[i].firstChild.val, 10); //
		pmids.push(pmid);
	}
	
	callback(null, pmids);
	


};


// CitationController.prototype.existingPmids = function(pmids, callback){
// this.pmids = pmids;
	
		
// 	ArticleModel.find({pmid: {$in: this.pmids}}, "pmid", function(err, result){
// 		if(err){
// 			callback(err)
// 		}else{
// 		callback(null, result)
// 	}
// 	});
	
// };

// CitationController.prototype.sortPmids = function(pmidArray, callback){

// 	var toSort = pmidArray;

// 	this.existingPmids(pmidArray, function(err, exist){

// 		if(exist === undefined || exist.length === 0){
// 			callback(null, toSort);
// 		}else{

// 			var pmidsExist = _.pluck(exist, "pmid");

// 			var newPmids = _.difference(toSort, pmidsExist);

// 			callback(err, newPmids, pmidsExist);
// 		}

// 	});

	

// };


// CitationController.prototype.addNewPmidsToDb = function(newPmids, seedPmidObjectId, callback){

// 	var documentArray = [];
	
// 	for(var i = 0, l = newPmids.length; i < l; i++){

// 		var documentObject = {"pmid": newPmids[i], "references": seedPmidObjectId};
// 		documentArray.push(documentObject);

// 	}

// 	ArticleModel.create(documentArray, function(err, result){
// 		if(err){
// 			callback(null, err);
// 		}else{
// 			//console.log("added "+ result)
// 			callback(null, result);
// 		}
// 	})
				

// };

// CitationController.prototype.updateExistingPmids = function(existingPmids, seedPmidObjectId, callback){

// 	var cbErr;
// 	var finalCbResult;
// 	var timeoutCallback = callback;
	
	


	
	
// 	for(var i = 0, l = existingPmids.length; i<l; i++){
// 					console.log("existing pmid: "+existingPmids[i])
// 					ArticleModel.findOneAndUpdate({pmid: existingPmids[i]}, {$addToSet: {references: seedPmidObjectId}}, function(err, result){
// 						if(err){
// 							cbErr = err;
// 						}else{
// 							finalCbResult = result;
// 						}
							
							
// 					})
// 				}

// 	setTimeout(function(timeoutCallback){
		
// 		callback(null, finalCbResult, seedPmidObjectId);
// 	}, 500);


	
// };


CitationController.prototype.upsertDocs = function(pmids, seedObjectId, callback){

	var cbErr;
	var finalCbResult;
	var timeoutCallback = callback;
	var self = this;
	
	


	
	
	for(var i = 0, l = pmids.length; i<l; i++){
					console.log("updating/adding: "+pmids[i])
					ArticleModel.findOneAndUpdate({pmid: pmids[i]}, {$addToSet: {references: seedObjectId}}, {upsert:true}, function(err, result){
						if(err){
							cbErr = err;
						}else{
							finalCbResult = result;
						}
							
							
					})
				}

	setTimeout(function(timeoutCallback){
		
		callback(null, finalCbResult, seedObjectId);
	}, 1500);//give it 1.5s for pmids to be added before calling back out of this. 

}
	

module.exports = CitationController;