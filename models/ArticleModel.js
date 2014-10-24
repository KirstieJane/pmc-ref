var mongoose = require('mongoose');
var connection = mongoose.connect('mongodb://localhost/test')

//MongoDb Schema definition of Articles

var Schema = mongoose.Schema;


var ObjectId = mongoose.Schema.Types.ObjectId;


var articleSchema = new Schema({
	
	//use default id
	//_id: ObjectId,
	title: { type: String, index:true}, 
	doi: { type: String, index:true}, // "10.1038/nature11413" format 
	pmid: {type: Number, index: true},
	pmcid: String,
	author: String,
	license: String,
	references: [{ type: ObjectId, ref: "ArticleModel" }], //refs array will be composed of ids of other docs in db. Is _id ObjectId? Type should be ObjectId not Number.
	is_ref_of: [{ type: ObjectId, ref: "ArticleModel"}], // ref to Article where it appears in the reference section. It could be the reference in more than one article in db.
	journal: {type: ObjectId, ref: "JournalModel"}, 
	volume: Number,
	date: Date,
	year: String,
	link: String,// "http://dx.doi.org/" link - concatenate with doi field
	spage: String,
	free_access: Boolean,
	abstract: String,
	citation_count: Number,
	citation_group: String,// value is string value of a range 25..50 if citation count is between those two values.
	reference_count: Number,
	group: String, //value is base for articles whose reference and citation data I've collected
	sub_group: String // value is either test or train. Train is data is used to train algorithms. Test group is used to test algorithms



}); 



//is_ref_of does not include the number reference that the article is, for example...

//var ArticleModel = mongoose.model('ArticleModel', articleSchema);

//methods must be added to the schema before compiling it with mongoose.model()



//this is a static method. What will the long term implications of this be? Time will tell

articleSchema.statics.populateReferences = function(articleId, callback){
	//how would this be exposed as part of the api?

	var Article = mongoose.model('ArticleModel')// see what happens with this addition.

	this.find({is_ref_of: articleId}, function(err, results){
		if(err)console.log(err);
		
		var referenceArray = [];//init array to add each result._id to.
		
		for(var i = 0, l = results.length; i < l; i++){
			//iterate over results...
			referenceArray.push(results[i]["_id"]);

		}
		//use Article here because of scoping. `this` was seeing a Promise, which does not have an update method, apparently
		//using $addToSet and $each modifier to append each result
		var referenceCount = referenceArray.length;

		Article.update({_id: articleId}, {$addToSet : {references: {$each: referenceArray}}, $set:{reference_count: referenceCount }}, function(err, results){
			if(err)console.log(err);
			callback(results);
		})
		
	});
}


articleSchema.statics.populateCitations = function(articleId, callback){
//would be nice to call this and set whether it populates references or is_ref_of instead of DUPLICATING
	var Article = mongoose.model("ArticleModel");
	//seedPmidObjectId
	//find all document where seedPmidObjectId is a value
	this.find({references: articleId}, function(err, results){

		if(err) console.log(err);

		var citationArray = []; 
		//citationArray.length is the value I need to use to increment citation_count by as, for now, citations are only coming from PubMed 
		//citation_count = citationArray.length 

		for(var i = 0, l = results.length; i < l; i++){
			console.log(results[i]["_id"])
			citationArray.push(results[i]["_id"])
		}

		var citationCount = citationArray.length;

		//Article.update({_id: articleId}, {$set: {citation_count:0}}, function(err, result){
			Article.update({_id: articleId}, {$addToSet : {is_ref_of: {$each: citationArray}}, $set:{citation_count: citationCount }}, function(err, results){
			if(err) console.log(err);
			callback(results)
		});


		//});

		// Article.update({_id: articleId}, {$addToSet : {is_ref_of: {$each: citationArray}}, $inc:{citation_count: citationCount }}, function(err, results){
		// 	if(err) console.log(err);
		// 	callback(results)
		// });

	});

}




	
//TO IMPLEMENT - static methods



//articleSchema.statics.generateLink = function(){}

//articleSchema.statics.sumFreeRefs = function(){}



//maybe this will change when it goes via the express app, which will be connecting the the db instead of direct from here.
var ArticleModel = connection.model('ArticleModel', articleSchema);// what's the reasoning behind connection model compile, again? Something about tying the model to the connection


module.exports = ArticleModel; 


