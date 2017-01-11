var http = require('http');
var repo = require('simple-git')(__dirname);

var server = http.createServer(function(req,res){
	repo.pull(function(err, data){
		if(err){
			console.log(err);
			res.statusCode = 500;
			res.end();
		}
		else if(data.summary.changes + data.summary.insertions + data.summary.deletions === 0){
			console.log('Pull requested, no changes');
			res.statusCode = 304;
			res.end();
		}
		else {
			console.log('Pull requested, updating');
			res.statusCode = 200;
			res.end();
		}
	});
});

server.listen(8080);
console.log('Listening on port 8080');

