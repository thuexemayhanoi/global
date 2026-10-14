/**
 * Writer request file schema shared by the Writer branch CLI and the trusted
 * main-only GitHub Actions coordinator. No YAML/JavaScript from the branch runs.
 */
import {ensureIdentity} from "./writer-pool-core.mjs";
export function requestPath(writer,session){
 return "factory/external-writers/requests/"+writer+"/"+session+".json";
}
export function validateRequest(req,path,branch){
 if(!req||typeof req!=="object"||Array.isArray(req))throw Error("Missing Writer start request JSON");
 if(req.version!==1||req.enabled!==true||req.mode!=="continuous-drafts")throw Error("Invalid continuous Writer start request");
 ensureIdentity(req.writer,req.session,req.branch);
 if(req.branch!==branch)throw Error("Request branch mismatch "+req.branch+" vs "+branch);
 if(requestPath(req.writer,req.session)!==path)throw Error("Request filename does not match Writer session");
 const extras=Object.keys(req).filter(k=>!["version","enabled","mode","writer","session","branch"].includes(k));
 if(extras.length)throw Error("Unexpected Writer request fields: "+extras.join(", "));
 return req;
}
export function newRequest(writer,session,branch){
 const obj={version:1,enabled:true,mode:"continuous-drafts",writer,session,branch};
 validateRequest(obj,requestPath(writer,session),branch);
 return obj;
}
