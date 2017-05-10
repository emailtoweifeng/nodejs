var mongoose = require('mongoose');

/*
 * Our message schema
 *
 * All actions are recorded as events or messages
 */

var Message = module.exports = (function () {
  var Schema = new mongoose.Schema({
    //used to reference the original message
    reference: {type:mongoose.Schema.Types.ObjectId, required: false, default: null, ref:'Message'},
    action: {type:String, required: true},
    actor:  {type:String, required: true},
    target:  {type:String, required: true},
    content:  {type:mongoose.Schema.Types.Mixed, required: false},
    created: {type:Date, required:true, Default:Date.now},
    published: {type:Date, required:false, Default:Date.now},
    active: {type:Boolean, required:true, default:true},
    viewed: {type:Date, required:false, default:null},
    path: {type:Number, required:false, default:0},
    sock: {type:String, required:false, default:null}
  }); 

  //TODO investigate further indexing options
  Schema.index({actor: 1, created: 1});
  Schema.index({sock: 1, target: 1, created: 1, viewed:1, path: 1});

  return mongoose.model('Message', Schema);
})();
