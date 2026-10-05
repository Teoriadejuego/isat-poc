'use strict';
importScripts('../vendor/xlsx.full.min.js');
self.onmessage=function(event){
  try{
    const book=XLSX.read(event.data,{type:'array',cellFormula:false,cellHTML:false,cellDates:false,sheetRows:10002});
    if(book.SheetNames.length>20)throw Error();let cells=0;
    const sheets=book.SheetNames.map(name=>{
      const sheet=book.Sheets[name],ref=XLSX.utils.decode_range(sheet['!fullref']||sheet['!ref']||'A1');
      cells+=(ref.e.r+1)*(ref.e.c+1);
      if(ref.e.r>10000||ref.e.c>199||cells>1500000)return {name,unsupported:true};
      return {name,rows:XLSX.utils.sheet_to_json(sheet,{header:1,defval:null,raw:true,blankrows:false})};
    });self.postMessage({sheets});
  }catch{self.postMessage({error:'No se pudo leer el archivo. Elige un Excel válido, sin contraseña, con un máximo de 20 hojas y 10.000 registros.'});}
};
