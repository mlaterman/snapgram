var http = require('http');
    
var concurrency = [1, 10, 50, 100, 150, 200, 250, 300, 400, 500, 600, 700, 800, 900, 1000];



for(var i =0; i<concurrency.length;++i){
     concurrent(concurrency[i])
}
function getOpts(val){
    return  {
        host: 'node.cs.ucalgary.ca',
        path: '/users/' + val.toString(),
        port: 8500,
        method: 'GET',
        Connection: 'keep-alive',
    };

}

function concurrent(concur_num) {
    var request_id = 0;
    var response_times = new Array(concur_num);

    for(var i = 0; i < concur_num; ++i)
        create_request(getOpts(i+1));

    function create_request(opts){

        var s_time = new Date(),
            e_time = 0;
        var size = 0;

        var request = http.request(opts);

        request.on('response', function(response) {
            response.setEncoding('utf8');
            response.on('data', function(chunk){
                size += chunk.length;
            });
            response.on('end', function (){
                var myID = request_id;
                request_id = request_id + 1;    

                e_time = new Date();
                response_times[myID] = e_time - s_time;
                if(myID== concur_num-1){
                   var sum=0;
                   for(var i =0; i < concur_num; ++i){
                       sum += response_times[i];
                   }
                   //return sum/concur_num;
                   var avg = sum/concur_num;
                   console.log("Concurrency: ", concur_num,"; Average time:", avg, "ms", "Throughput:", size/avg*1000*concur_num);
                }
            });
        });

        request.on('error', function(e){
            throw e;
        });
        request.end();
    }
}


