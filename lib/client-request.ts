/** Never retry a mutation automatically: the server may have already applied it. */
export async function doctorRequest(init:RequestInit={},timeoutMs=120000):Promise<Response>{
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=await fetch('/api/doctor',{...init,signal:controller.signal});
    // Include body delivery in the deadline, not just response headers.
    const body=await response.text();
    return new Response(body,{status:response.status,headers:response.headers});
  }catch(error){
    if(controller.signal.aborted)throw new Error('Request timed out. Reload to check the latest server state before trying again; do not repeat an approval blindly.');
    throw new Error('Cannot reach the local server. Check that it is running, then reload to check the latest state.');
  }finally{clearTimeout(timer);}
}
