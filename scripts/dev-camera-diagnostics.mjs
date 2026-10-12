export function cameraDiagnostics(){
  const samples=new Map();
  return {name:'local-camera-diagnostics',configureServer(server){server.middlewares.use('/__northline-camera',(req,res)=>{
    if(req.method==='POST'){
      let body='';req.on('data',part=>{body+=part;if(body.length>16000)req.destroy();});req.on('end',()=>{try{samples.set(req.socket.remoteAddress,{at:new Date().toISOString(),...JSON.parse(body)});}catch{}res.statusCode=204;res.end();});
    }else{res.setHeader('Content-Type','application/json');res.end(JSON.stringify([...samples.entries()].map(([client,sample])=>({client,...sample}))));}
  });}};
}
