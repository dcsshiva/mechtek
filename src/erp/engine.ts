// @ts-nocheck
/*
 * Selvantra Technologies — in-memory data engine (sample data + business rules).
 * Ported from the Selvantra Technologies HTML prototype. Every screen reads and mutates these
 * collections; call bump() from store.ts after a change so React re-renders.
 * Backend phase: each collection maps to a Lovable Cloud (Supabase) table.
 */
import { TODAY, addDays, ds, daysFrom, inr, inrShort, qfmt, nowTime } from "./format";

/** Signed-in staff id (set by session.ts). */
export const SESSION: { user: string | null } = { user: null };

export const SEQ: Record<string, number> = {role: 11, staff: 12, wo: 3100, pr: 501, so: 2606, q: 145, lead: 107, tk: 312, serial: 180, inv: 46, dc: 118, ven: 7, bill: 302, dn: 51, adj: 13, ct: 15, act: 513};

/* ================= masters ================= */
/* ================= Master data (from mechtek.in + indicative BOMs) ================= */
export const CATS: any = ['Sheet metal & structure','Machined stock','Drive & motion','Pneumatics','Electrical & controls','Heating & cooling','Hardware & packing','Outsourced processes'];
export const CAT_VAR: any = ['--bar-1','--bar-2','--bar-3','--bar-4','--bar-5','--bar-6','--bar-7','--bar-8'];
// [code, description, category index, uom, rate, onHand, reorder]
export const RM_RAW: any = [
 ['RM-SS304-SH20','SS 304 sheet, 2.0 mm',0,'kg',262,620,300],
 ['RM-SS304-SH15','SS 304 sheet, 1.5 mm',0,'kg',268,410,250],
 ['RM-SS304-SQ40','SS 304 square tube 40×40×2 mm',0,'m',420,160,80],
 ['RM-MS-ISMC100','MS channel ISMC 100 (base frame)',0,'kg',72,900,500],
 ['RM-MS-PL12','MS plate, 12 mm',0,'kg',70,380,200],
 ['RM-PC-GUARD6','Polycarbonate guard sheet, 6 mm',0,'m²',5200,9,6],
 ['RM-AL6061-PL25','Aluminium 6061-T6 plate, 25 mm (mould blocks)',1,'kg',485,190,150],
 ['RM-AL6061-RD','Aluminium 6061 round bar',1,'kg',462,40,25],
 ['RM-SS316-RD60','SS 316 round bar Ø60 (pressure & web rollers)',1,'kg',525,30,40],
 ['RM-EN8-RD','EN8 round bar (shafts)',1,'kg',96,140,80],
 ['RM-D2-BLK','D2 tool steel block (punch & die)',1,'kg',655,22,30],
 ['RM-BRASS-RD','Brass round bar (forming plugs, guides)',1,'kg',720,12,8],
 ['RM-POM-RD','Acetal (POM) rod (magazine, change parts)',1,'kg',520,18,10],
 ['RM-PTFE-SH3','PTFE sheet, 3 mm (plug assist)',1,'kg',1400,4,3],
 ['RM-MTR-AC05G','AC induction motor 0.5 kW with gearbox',2,'nos',14500,3,2],
 ['RM-MTR-GM15','Geared motor 1.5 kW, 3-phase',2,'nos',32000,1,1],
 ['RM-SERVO-1K','Servo motor 1 kW with drive (web indexing)',2,'set',78000,0,1],
 ['RM-VFD-05','VFD 0.5 kW, single-phase input',2,'nos',9800,2,2],
 ['RM-BRG-6204','Ball bearing 6204-2RS',2,'nos',180,90,60],
 ['RM-BRG-UCP205','Pillow block bearing UCP 205',2,'nos',650,20,16],
 ['RM-LMG-20','Linear guide rail + block, 20 mm',2,'set',7800,6,4],
 ['RM-CHAIN-SET','Roller chain and sprocket set',2,'set',4200,4,2],
 ['RM-CYL-50','Pneumatic cylinder Ø50 × 50 stroke',3,'nos',6800,6,6],
 ['RM-CYL-32','Pneumatic cylinder Ø32 × 25 stroke',3,'nos',4200,8,6],
 ['RM-SV-52','Solenoid valve 5/2, 24 VDC',3,'nos',3200,14,10],
 ['RM-FRL-14','FRL unit 1/4"',3,'nos',2600,3,2],
 ['RM-PU-8','PU tube, 8 mm',3,'m',45,220,100],
 ['RM-PLC-14IO','PLC CPU, 14 I/O',4,'nos',38000,2,2],
 ['RM-HMI-7','Touch HMI, 7 inch',4,'nos',26000,1,2],
 ['RM-SMPS-24','SMPS 24 VDC, 5 A',4,'nos',2400,6,4],
 ['RM-TC-PID','PID temperature controller',4,'nos',3800,6,4],
 ['RM-SSR-25','Solid-state relay, 25 A',4,'nos',1400,8,6],
 ['RM-SWG-KIT','MCB, contactor and relay kit',4,'set',9500,3,2],
 ['RM-PROX','Inductive proximity sensor',4,'nos',1350,15,10],
 ['RM-PANEL-SS','Control panel enclosure, SS 304',4,'nos',18000,2,2],
 ['RM-CABLE-15','Flexible cable 1.5 sq mm',4,'m',38,650,300],
 ['RM-HTR-CART','Cartridge heater 230 V, 400 W',5,'nos',850,20,16],
 ['RM-TCPL-J','Thermocouple, J-type',5,'nos',650,8,6],
 ['RM-COOL-PLT','Water cooling plate (copper tube)',5,'nos',5500,2,2],
 ['RM-FAST-SS','SS fastener kit',6,'set',3500,6,4],
 ['RM-LEVEL-M','Levelling mount (anti-vibration)',6,'nos',900,16,12],
 ['RM-PAINT-PU','PU paint for MS frame',6,'L',780,20,10],
 ['RM-CRATE','Seaworthy wooden crate',6,'nos',16000,2,2],
 ['RM-JW-ANOD','Hard anodising (job work)',7,'kg',180,0,0],
 ['RM-JW-HT','Heat treatment of D2 (job work)',7,'kg',120,0,0]
];
export const RM = RM_RAW.map(r=>({code:r[0],name:r[1],cat:r[2],uom:r[3],rate:r[4],onHand:r[5],reorder:r[6],service:r[2]===7}));
export const rmBy = Object.fromEntries(RM.map(r=>[r.code,r]));

// Finished goods — names and specs as published on mechtek.in
export const FG: any = [
 {code:'FG-EBP',name:'EZEE BLIST-P/S',family:'Blister packing machine',sub:'Lab model',kind:'machine',price:950000,url:'https://mechtek.in/product/ezee-de-blist-p/',
  specs:[['Forming / sealing','Flat forming, flat sealing'],['Max forming depth','10 mm Alu/Alu, 12 mm PVC/Alu'],['Max blister size','70×100 mm (2 packs), 100×150 mm (1 pack)'],['Heating','0–200 °C'],['Power','230 V, 1-phase, 2.0 kW'],['Compressed air','6–9 bar'],['Cooling water','2 L/min at 10–15 °C'],['Controls','PLC with touch screen'],['Dimensions','640 × 750 × 1500 mm'],['Net weight','260 kg']]},
 {code:'FG-EB160',name:'EB-160',family:'Blister packing machine',sub:'Pilot batch',kind:'machine',price:3200000,url:'https://mechtek.in/product/blister-packing-machine-pilot-batch-eb-160/',
  specs:[['Output','15–25 cycles/min'],['Max forming area','145 × 118 × 12 mm (10 mm Alu/Alu)'],['Advance','30–120 mm'],['Stations','Flat forming, flat sealing, punching'],['Power','380 V, 50 Hz; main motor 1.5 kW'],['Indexing','Servo web indexing'],['Base / lidding foil','160 mm max'],['Compressed air','6–9 bar'],['Controls','PLC with touch screen'],['Weight','1200 kg']]},
 {code:'FG-EB140',name:'EB-140',family:'Blister packing machine',sub:'Pilot batch',kind:'machine',price:2800000,url:'https://mechtek.in/?product=blister-packing-machine-eb-140',flag:'Listed on the website menu; its page shows EB-160 details. Specs to confirm with Mechtek.',
  specs:[['Output','To confirm'],['Stations','Flat forming, flat sealing, punching'],['Controls','PLC with touch screen'],['Materials','PVC/Alu, PVC+PVDC/Alu, Alu/Alu']]},
 {code:'FG-DB4S',name:'EZEE DE BLIST 1510-4S',family:'De-foiling machine',sub:'Fully automatic',kind:'machine',price:1400000,url:'https://mechtek.in/?product=fully-automatic-de-foiling-machine-ezee-de-blist-1510-4s-2s',
  specs:[['Output','30–40 packs/min'],['Max blister size','100 × 150 × 15 mm'],['Power','110/230 V, 1-phase, 2.0 kW'],['Compressed air','6–9 bar'],['Indexing','Pneumatic indexer'],['Controls','PLC with touch screen'],['Dimensions','1200 × 800 × 1700 mm'],['Weight','500 kg']]},
 {code:'FG-DB2S',name:'EZEE DE BLIST 1510-2S',family:'De-foiling machine',sub:'Fully automatic',kind:'machine',price:850000,url:'https://mechtek.in/?product=fully-automatic-de-foiling-machine-ezee-de-blist-1510-4s-2s',
  specs:[['Output','15–25 packs/min'],['Max blister size','100 × 150 × 15 mm'],['Power','110/230 V, 1-phase, 2.0 kW'],['Compressed air','6 bar'],['Indexing','Pneumatic indexer'],['Controls','PLC with touch screen'],['Dimensions','610 × 650 × 1520 mm'],['Weight','200 kg']]},
 {code:'FG-DBA',name:'EZEE DE-BLIST-A',family:'De-foiling machine',sub:'Lab model, auto-feed',kind:'machine',price:320000,url:'https://mechtek.in/product/de-foiling-machine-ezee-de-blist-a/',
  specs:[['Output','30–40 blisters/min'],['Max blister size','100 × 150 × 15 mm'],['Power','100/230 V, 1-phase, 0.5 kW'],['Drive','AC induction motor with gearbox'],['Roller','SS 316 pressure roller'],['Feed','Auto-feed with adjustable magazine'],['Dimensions','500 × 550 × 1400 mm'],['Net weight','125 kg']]},
 {code:'FG-DBM',name:'EZEE DE-BLIST-M',family:'De-foiling machine',sub:'Compact lab model',kind:'machine',price:260000,url:'https://mechtek.in/product/de-foiling-machine-ezee-de-blist-m/',
  specs:[['Output','30–40 blisters/min'],['Max blister size','100 × 150 × 12 mm'],['Power','100/230 V, 1-phase, 0.5 kW'],['Drive','AC induction motor with gearbox'],['Roller','SS 316 pressure roller'],['Dimensions','500 × 550 × 1400 mm'],['Net weight','125 kg']]},
 {code:'FG-TF',name:'Tube Feeder',family:'Accessory',sub:'Feeding attachment',kind:'machine',price:140000,url:'https://mechtek.in/',flag:'Shown on the home page; no specification page published.',
  specs:[['Use','Product feeding for blister lines'],['Specs','Not published on website']]},
 {code:'CP-PVC',name:'Blister mould set, PVC-ALU',family:'Change parts',sub:'Format parts, any machine make',kind:'part',price:120000,url:'https://mechtek.in/change-parts/',
  specs:[['Set includes','Forming, sealing, punching, guide parts'],['Pack type','PVC-ALU, PVC+PVDC/ALU'],['Made to','Customer machine make/model and product size'],['Approval','Drawing sign-off before CNC']]},
 {code:'CP-ALU',name:'Blister mould set, ALU-ALU',family:'Change parts',sub:'Format parts, any machine make',kind:'part',price:90000,url:'https://mechtek.in/change-parts/',
  specs:[['Set includes','Cold-forming plugs, sealing, punching, guides'],['Pack type','ALU-ALU'],['Made to','Customer machine make/model and product size'],['Approval','Drawing sign-off before CNC']]},
 {code:'CP-CTN',name:'Cartoning change parts set',family:'Change parts',sub:'Format parts, any machine make',kind:'part',price:90000,url:'https://mechtek.in/change-parts/',
  specs:[['Set includes','Buckets, pushers, carton guides'],['Made to','Customer cartoner and carton size'],['Approval','Drawing sign-off before CNC']]}
];
export const fgBy = Object.fromEntries(FG.map(f=>[f.code,f]));

// Indicative BOMs: [sub-assembly, rm code, qty]
export const G: any = {F:'Frame & body',FO:'Forming station',SE:'Sealing station',PU:'Punching station',IX:'Drive & indexing',PN:'Pneumatics',EL:'Electrical panel',HP:'Hardware & packing',RO:'Roller & de-foiling head',MG:'Magazine & feed',MO:'Mould set',JW:'Outsourced processes'};
export const BOM: any = {
 'FG-EBP':[
  [G.F,'RM-SS304-SQ40',18],[G.F,'RM-SS304-SH20',45],[G.F,'RM-SS304-SH15',30],[G.F,'RM-PC-GUARD6',1.2],[G.F,'RM-LEVEL-M',4],
  [G.FO,'RM-AL6061-PL25',14],[G.FO,'RM-HTR-CART',4],[G.FO,'RM-TCPL-J',2],[G.FO,'RM-CYL-50',1],
  [G.SE,'RM-AL6061-PL25',10],[G.SE,'RM-HTR-CART',4],[G.SE,'RM-TCPL-J',2],[G.SE,'RM-CYL-50',1],[G.SE,'RM-COOL-PLT',1],
  [G.PU,'RM-D2-BLK',6],[G.PU,'RM-CYL-32',1],
  [G.IX,'RM-EN8-RD',12],[G.IX,'RM-LMG-20',2],[G.IX,'RM-BRG-6204',8],[G.IX,'RM-CYL-32',1],
  [G.PN,'RM-SV-52',4],[G.PN,'RM-FRL-14',1],[G.PN,'RM-PU-8',15],
  [G.EL,'RM-PLC-14IO',1],[G.EL,'RM-HMI-7',1],[G.EL,'RM-SMPS-24',1],[G.EL,'RM-TC-PID',2],[G.EL,'RM-SSR-25',2],[G.EL,'RM-SWG-KIT',1],[G.EL,'RM-PROX',3],[G.EL,'RM-CABLE-15',60],[G.EL,'RM-PANEL-SS',1],
  [G.HP,'RM-FAST-SS',1],[G.HP,'RM-CRATE',1]],
 'FG-EB160':[
  [G.F,'RM-MS-ISMC100',380],[G.F,'RM-MS-PL12',160],[G.F,'RM-SS304-SH20',140],[G.F,'RM-SS304-SH15',90],[G.F,'RM-SS304-SQ40',40],[G.F,'RM-PC-GUARD6',4],[G.F,'RM-PAINT-PU',8],[G.F,'RM-LEVEL-M',6],
  [G.FO,'RM-AL6061-PL25',35],[G.FO,'RM-HTR-CART',8],[G.FO,'RM-TCPL-J',2],[G.FO,'RM-CYL-50',2],[G.FO,'RM-LMG-20',2],
  [G.SE,'RM-AL6061-PL25',30],[G.SE,'RM-HTR-CART',8],[G.SE,'RM-TCPL-J',2],[G.SE,'RM-COOL-PLT',2],[G.SE,'RM-CYL-50',2],
  [G.PU,'RM-D2-BLK',18],[G.PU,'RM-CYL-50',1],
  [G.IX,'RM-MTR-GM15',1],[G.IX,'RM-SERVO-1K',1],[G.IX,'RM-EN8-RD',60],[G.IX,'RM-SS316-RD60',20],[G.IX,'RM-BRG-6204',24],[G.IX,'RM-BRG-UCP205',8],[G.IX,'RM-CHAIN-SET',1],[G.IX,'RM-LMG-20',4],
  [G.PN,'RM-SV-52',8],[G.PN,'RM-FRL-14',1],[G.PN,'RM-PU-8',40],
  [G.EL,'RM-PLC-14IO',1],[G.EL,'RM-HMI-7',1],[G.EL,'RM-SMPS-24',2],[G.EL,'RM-TC-PID',4],[G.EL,'RM-SSR-25',4],[G.EL,'RM-SWG-KIT',1],[G.EL,'RM-PROX',8],[G.EL,'RM-CABLE-15',180],[G.EL,'RM-PANEL-SS',1],
  [G.HP,'RM-FAST-SS',3],[G.HP,'RM-CRATE',1]],
 'FG-EB140':[
  [G.F,'RM-MS-ISMC100',320],[G.F,'RM-MS-PL12',140],[G.F,'RM-SS304-SH20',120],[G.F,'RM-SS304-SH15',80],[G.F,'RM-SS304-SQ40',34],[G.F,'RM-PC-GUARD6',3.5],[G.F,'RM-PAINT-PU',7],[G.F,'RM-LEVEL-M',6],
  [G.FO,'RM-AL6061-PL25',30],[G.FO,'RM-HTR-CART',6],[G.FO,'RM-TCPL-J',2],[G.FO,'RM-CYL-50',2],[G.FO,'RM-LMG-20',2],
  [G.SE,'RM-AL6061-PL25',26],[G.SE,'RM-HTR-CART',6],[G.SE,'RM-TCPL-J',2],[G.SE,'RM-COOL-PLT',2],[G.SE,'RM-CYL-50',2],
  [G.PU,'RM-D2-BLK',15],[G.PU,'RM-CYL-50',1],
  [G.IX,'RM-MTR-GM15',1],[G.IX,'RM-SERVO-1K',1],[G.IX,'RM-EN8-RD',50],[G.IX,'RM-SS316-RD60',16],[G.IX,'RM-BRG-6204',20],[G.IX,'RM-BRG-UCP205',8],[G.IX,'RM-CHAIN-SET',1],[G.IX,'RM-LMG-20',4],
  [G.PN,'RM-SV-52',8],[G.PN,'RM-FRL-14',1],[G.PN,'RM-PU-8',35],
  [G.EL,'RM-PLC-14IO',1],[G.EL,'RM-HMI-7',1],[G.EL,'RM-SMPS-24',2],[G.EL,'RM-TC-PID',4],[G.EL,'RM-SSR-25',4],[G.EL,'RM-SWG-KIT',1],[G.EL,'RM-PROX',8],[G.EL,'RM-CABLE-15',160],[G.EL,'RM-PANEL-SS',1],
  [G.HP,'RM-FAST-SS',3],[G.HP,'RM-CRATE',1]],
 'FG-DB4S':[
  [G.F,'RM-MS-ISMC100',120],[G.F,'RM-SS304-SH20',90],[G.F,'RM-SS304-SH15',55],[G.F,'RM-SS304-SQ40',30],[G.F,'RM-PC-GUARD6',2.5],[G.F,'RM-PAINT-PU',3],[G.F,'RM-LEVEL-M',4],
  [G.RO,'RM-SS316-RD60',40],[G.RO,'RM-EN8-RD',30],[G.RO,'RM-BRG-6204',24],[G.RO,'RM-BRG-UCP205',8],
  [G.IX,'RM-CYL-50',2],[G.IX,'RM-CYL-32',4],[G.IX,'RM-LMG-20',4],[G.IX,'RM-MTR-AC05G',2],[G.IX,'RM-VFD-05',2],[G.IX,'RM-CHAIN-SET',2],
  [G.PN,'RM-SV-52',6],[G.PN,'RM-FRL-14',1],[G.PN,'RM-PU-8',30],
  [G.EL,'RM-PLC-14IO',1],[G.EL,'RM-HMI-7',1],[G.EL,'RM-SMPS-24',1],[G.EL,'RM-SWG-KIT',1],[G.EL,'RM-PROX',6],[G.EL,'RM-CABLE-15',90],[G.EL,'RM-PANEL-SS',1],
  [G.HP,'RM-FAST-SS',2],[G.HP,'RM-CRATE',1]],
 'FG-DB2S':[
  [G.F,'RM-SS304-SH20',45],[G.F,'RM-SS304-SH15',30],[G.F,'RM-SS304-SQ40',16],[G.F,'RM-PC-GUARD6',1.2],[G.F,'RM-LEVEL-M',4],
  [G.RO,'RM-SS316-RD60',20],[G.RO,'RM-EN8-RD',14],[G.RO,'RM-BRG-6204',12],[G.RO,'RM-BRG-UCP205',4],
  [G.IX,'RM-CYL-50',1],[G.IX,'RM-CYL-32',2],[G.IX,'RM-LMG-20',2],[G.IX,'RM-MTR-AC05G',1],[G.IX,'RM-VFD-05',1],[G.IX,'RM-CHAIN-SET',1],
  [G.PN,'RM-SV-52',3],[G.PN,'RM-FRL-14',1],[G.PN,'RM-PU-8',15],
  [G.EL,'RM-PLC-14IO',1],[G.EL,'RM-HMI-7',1],[G.EL,'RM-SMPS-24',1],[G.EL,'RM-SWG-KIT',1],[G.EL,'RM-PROX',3],[G.EL,'RM-CABLE-15',45],[G.EL,'RM-PANEL-SS',1],
  [G.HP,'RM-FAST-SS',1],[G.HP,'RM-CRATE',1]],
 'FG-DBA':[
  [G.F,'RM-SS304-SQ40',10],[G.F,'RM-SS304-SH20',22],[G.F,'RM-SS304-SH15',15],[G.F,'RM-PC-GUARD6',0.6],[G.F,'RM-LEVEL-M',4],
  [G.RO,'RM-SS316-RD60',14],[G.RO,'RM-EN8-RD',6],[G.RO,'RM-BRG-6204',6],[G.RO,'RM-BRG-UCP205',4],
  [G.IX,'RM-MTR-AC05G',1],[G.IX,'RM-VFD-05',1],[G.IX,'RM-CHAIN-SET',1],
  [G.MG,'RM-POM-RD',3],[G.MG,'RM-AL6061-RD',5],[G.MG,'RM-BRASS-RD',2],
  [G.EL,'RM-SWG-KIT',1],[G.EL,'RM-PROX',1],[G.EL,'RM-CABLE-15',10],
  [G.HP,'RM-FAST-SS',1],[G.HP,'RM-CRATE',1]],
 'FG-DBM':[
  [G.F,'RM-SS304-SQ40',10],[G.F,'RM-SS304-SH20',22],[G.F,'RM-SS304-SH15',15],[G.F,'RM-PC-GUARD6',0.6],[G.F,'RM-LEVEL-M',4],
  [G.RO,'RM-SS316-RD60',14],[G.RO,'RM-EN8-RD',6],[G.RO,'RM-BRG-6204',6],[G.RO,'RM-BRG-UCP205',4],
  [G.IX,'RM-MTR-AC05G',1],[G.IX,'RM-CHAIN-SET',1],
  [G.MG,'RM-POM-RD',2],[G.MG,'RM-AL6061-RD',3],
  [G.EL,'RM-SWG-KIT',1],[G.EL,'RM-CABLE-15',8],
  [G.HP,'RM-FAST-SS',1],[G.HP,'RM-CRATE',1]],
 'FG-TF':[
  [G.F,'RM-SS304-SH15',12],[G.F,'RM-SS304-SQ40',4],
  [G.MG,'RM-POM-RD',2],[G.MG,'RM-AL6061-RD',3],
  [G.PN,'RM-CYL-32',1],[G.PN,'RM-SV-52',1],[G.PN,'RM-PU-8',5],
  [G.EL,'RM-PROX',1],[G.EL,'RM-CABLE-15',6],
  [G.HP,'RM-FAST-SS',1]],
 'CP-PVC':[
  [G.MO,'RM-AL6061-PL25',28],[G.MO,'RM-BRASS-RD',3],[G.MO,'RM-D2-BLK',8],[G.MO,'RM-POM-RD',1],[G.MO,'RM-FAST-SS',1],
  [G.JW,'RM-JW-ANOD',28],[G.JW,'RM-JW-HT',8]],
 'CP-ALU':[
  [G.MO,'RM-AL6061-PL25',34],[G.MO,'RM-PTFE-SH3',1],[G.MO,'RM-D2-BLK',10],[G.MO,'RM-POM-RD',1],[G.MO,'RM-FAST-SS',1],
  [G.JW,'RM-JW-ANOD',34],[G.JW,'RM-JW-HT',10]],
 'CP-CTN':[
  [G.MO,'RM-POM-RD',6],[G.MO,'RM-SS304-SH15',8],[G.MO,'RM-AL6061-PL25',6],[G.MO,'RM-FAST-SS',1],
  [G.JW,'RM-JW-ANOD',6]]
};
export const bomCost = code => (BOM[code]||[]).reduce((s,l)=>s+l[2]*rmBy[l[1]].rate,0);
export const whereUsed = rm => FG.filter(f=>(BOM[f.code]||[]).some(l=>l[1]===rm)).map(f=>f.code);

/* ================= roles ================= */
/* ================= Users & roles ================= */
export const MODULES: any = [
 ['Sales & CRM',[['leads','Leads'],['crm','CRM desk'],['customers','Customers'],['quotes','Quotations'],['orders','Sales orders'],['invoices','Invoices']]],
 ['Engineering',[['products','Finished goods'],['combos','Combo sets'],['bom','Bill of materials'],['materials','Raw materials']]],
 ['Operations',[['forecast','Demand forecast'],['mrp','Material planning'],['workorders','Work orders'],['dispatch','Dispatch']]],
 ['Purchase & stores',[['purchase','Purchase overview'],['vendors','Vendors'],['indent','Indents'],['po','Purchase orders'],['gate','Gate pass'],['grn','Goods receipt (GRN)'],['bills','Vendor bills']]],
 ['Stores',[['stores','Stores desk'],['inventory','Inventory'],['planning','Procurement planning'],['mr','Material requisition']]],
 ['Finance',[['receivables','Receivables'],['payables','Payables']]],
 ['After-sales',[['service','Installed base & service']]],
 ['Administration',[['staff','Staff master'],['roles','Role master']]]
];
export const MOD_KEYS = MODULES.flatMap(g=>g[1].map(m=>m[0]));
export const modName = k => (MODULES.flatMap(g=>g[1]).find(m=>m[0]===k)||[k,k])[1];
export const permsFrom = (full,view) => Object.fromEntries(MOD_KEYS.map(k=>[k, full.includes(k)?'full':view.includes(k)?'view':'none']));
export const APPROVALS: any = [['quotes','Quotations'],['indent','Indents'],['po','Purchase orders'],['gate','Outward gate passes'],['grn','GRN (QC acceptance)'],['mr','Material requisitions'],['bills','Vendor bills (3-way match)'],['adj','Stock adjustments']];
export const apv = list => Object.fromEntries(APPROVALS.map(([k])=>[k,list.includes(k)]));
export const ROLES: any = [
 {id:'R01',name:'Administrator',desc:'Full access to every module, approves all documents, manages staff and roles.',approvals:apv(APPROVALS.map(a=>a[0])),system:true,perms:permsFrom(MOD_KEYS,[])},
 {id:'R02',name:'Sales executive',desc:'Handles leads and customers, prepares quotations for approval.',approvals:apv([]),perms:permsFrom(['leads','customers','quotes'],['orders','products','invoices'])},
 {id:'R03',name:'Sales manager',desc:'Runs the sales team and approves quotations.',approvals:apv(['quotes']),perms:permsFrom(['leads','customers','quotes','orders'],['products','bom','service','invoices'])},
 {id:'R04',name:'Production supervisor',desc:'Plans and runs work orders, raises indents and material requisitions, approves requisitions.',approvals:apv(['mr']),perms:permsFrom(['workorders','mr','indent'],['orders','products','bom','materials','mrp','dispatch','grn','inventory'])},
 {id:'R05',name:'Stores & purchase',desc:'Store in-charge: runs the stores desk, inventory and procurement planning, responds to shop-floor requests, raises indents and POs, records GRNs.',approvals:apv([]),perms:permsFrom(['materials','mrp','indent','po','gate','grn','mr','vendors','stores','inventory','planning'],['products','bom','workorders','purchase','bills'])},
 {id:'R06',name:'Service engineer',desc:'Installation, commissioning, service tickets and AMC.',approvals:apv([]),perms:permsFrom(['service'],['customers','orders','products','invoices'])},
 {id:'R07',name:'Dispatch & logistics',desc:'Prepares documents and dispatches finished orders.',approvals:apv([]),perms:permsFrom(['dispatch'],['customers','orders','workorders','gate','invoices'])},
 {id:'R08',name:'Quality inspector',desc:'Inspects incoming material and approves or rejects GRNs.',approvals:apv(['grn']),perms:permsFrom(['grn'],['materials','po','gate','products','bom','purchase','vendors','inventory'])},
 {id:'R09',name:'Security',desc:'Records vehicles and material at the gate.',approvals:apv([]),perms:permsFrom(['gate'],['po'])},
 {id:'R10',name:'Accounts',desc:'Records advances and customer payments, books vendor bills and pays vendors, maintains GST details.',approvals:apv([]),perms:permsFrom(['invoices','orders','customers','bills'],['quotes','dispatch','po','grn','vendors','purchase'])}
];

export const roleBy = id => ROLES.find(r=>r.id===id);
export const DEPTS: any = ['Management','Sales','Engineering','Production','Stores & purchase','Quality','Service','Logistics','Accounts'];
export const STAFF: any = [
 {id:'S001',code:'EMP-001',name:'Admin',designation:'Director',dept:'Management',role:'R01',mobile:'90000 00101',email:'admin@mechtek.demo',doj:'2004-06-01',username:'admin',password:'mechtek@2026',active:true,lastLogin:null},
 {id:'S002',code:'EMP-014',name:'Karthik M',designation:'Sales executive',dept:'Sales',role:'R02',mobile:'90000 00114',email:'karthik@mechtek.demo',doj:'2021-07-12',username:'sales',password:'sales@2026',active:true,lastLogin:null},
 {id:'S003',code:'EMP-006',name:'Deepa R',designation:'Sales manager',dept:'Sales',role:'R03',mobile:'90000 00106',email:'deepa@mechtek.demo',doj:'2012-03-05',username:'deepa',password:'deepa@2026',active:true,lastLogin:null},
 {id:'S004',code:'EMP-009',name:'Manjunath S',designation:'Production supervisor',dept:'Production',role:'R04',mobile:'90000 00109',email:'manjunath@mechtek.demo',doj:'2014-11-20',username:'production',password:'prod@2026',active:true,lastLogin:null},
 {id:'S005',code:'EMP-021',name:'Farhan A',designation:'Stores in-charge',dept:'Stores & purchase',role:'R05',mobile:'90000 00121',email:'farhan@mechtek.demo',doj:'2019-02-01',username:'stores',password:'stores@2026',active:true,lastLogin:null},
 {id:'S006',code:'EMP-017',name:'Vinod P',designation:'Service engineer',dept:'Service',role:'R06',mobile:'90000 00117',email:'vinod@mechtek.demo',doj:'2018-08-16',username:'service',password:'service@2026',active:true,lastLogin:null},
 {id:'S007',code:'EMP-025',name:'Lakshmi N',designation:'Dispatch coordinator',dept:'Logistics',role:'R07',mobile:'90000 00125',email:'lakshmi@mechtek.demo',doj:'2022-04-04',username:'dispatch',password:'dispatch@2026',active:true,lastLogin:null},
 {id:'S009',code:'EMP-031',name:'Suma K',designation:'QC engineer',dept:'Quality',role:'R08',mobile:'90000 00131',email:'suma@mechtek.demo',doj:'2023-06-01',username:'quality',password:'quality@2026',active:true,lastLogin:null},
 {id:'S010',code:'EMP-040',name:'Gopal R',designation:'Security supervisor',dept:'Management',role:'R09',mobile:'90000 00140',email:'gopal@mechtek.demo',doj:'2020-09-10',username:'security',password:'security@2026',active:true,lastLogin:null},
 {id:'S011',code:'EMP-008',name:'Revathi S',designation:'Accounts executive',dept:'Accounts',role:'R10',mobile:'90000 00108',email:'revathi@mechtek.demo',doj:'2015-05-11',username:'accounts',password:'accounts@2026',active:true,lastLogin:null},
 {id:'S008',code:'EMP-011',name:'Ravi T',designation:'Sales executive',dept:'Sales',role:'R02',mobile:'90000 00111',email:'ravi@mechtek.demo',doj:'2016-01-18',username:'ravi',password:'ravi@2026',active:false,lastLogin:null}
];
export const staffBy = id => STAFF.find(x=>x.id===id);
export const DISC_LIMIT = 5;

/* ================= transactions ================= */
/* ================= Transactional sample data ================= */
export const CUST: any = [
 {id:'C001',name:'Sunrise Formulations',city:'Hyderabad',country:'India',state:'Telangana',gstin:'36AABCS1111A1Z1',addr:'Plot 12, IDA Jeedimetla',contact:'Purchase head'},
 {id:'C002',name:'Kaveri Labs',city:'Bengaluru',country:'India',state:'Karnataka',gstin:'29AABCK2222B1Z2',addr:'No. 44, KIADB Industrial Area, Bommasandra',contact:'Engineering manager'},
 {id:'C003',name:'Nilgiri Healthcare',city:'Baddi',country:'India',state:'Himachal Pradesh',gstin:'02AABCN3333C1Z3',addr:'Khasra 210, Village Katha',contact:'Packaging head'},
 {id:'C004',name:'Deccan Pharma',city:'Ahmedabad',country:'India',state:'Gujarat',gstin:'24AABCD4444D1Z4',addr:'Survey 88, Changodar GIDC',contact:'Plant head'},
 {id:'C005',name:'Coastal Generics',city:'Nairobi',country:'Kenya',contact:'Technical director'},
 {id:'C006',name:'Lotus Remedies',city:'Kathmandu',country:'Nepal',contact:'Production manager'},
 {id:'C007',name:'Mekong Pharma',city:'Ho Chi Minh City',country:'Vietnam',contact:'R&D head'},
 {id:'C008',name:'Gulf Medicare',city:'Dubai',country:'UAE',contact:'Procurement'}
];
export const custBy = id => CUST.find(c=>c.id===id);
export const LEAD_STAGES: any = ['New','Qualified','Quoted','Won','Lost'];
export const LEADS: any = [
 {id:'L-101',cust:'C007',item:'FG-EB160',qty:1,source:'CPhi expo',stage:'Qualified',follow:addDays(TODAY,1)},
 {id:'L-102',cust:'C006',item:'FG-DBM',qty:1,source:'Website',stage:'New',follow:addDays(TODAY,0)},
 {id:'L-103',cust:'C002',item:'CP-ALU',qty:2,source:'Repeat customer',stage:'Quoted',follow:addDays(TODAY,3)},
 {id:'L-104',cust:'C004',item:'CP-PVC',qty:1,source:'Installed-base alert',stage:'New',follow:addDays(TODAY,2)},
 {id:'L-105',cust:'C001',item:'FG-TF',qty:1,source:'Dealer',stage:'Qualified',follow:addDays(TODAY,-1)},
 {id:'L-106',cust:'C008',item:'FG-DB4S',qty:1,source:'P-MEC expo',stage:'Won',follow:null}
];
export const H = (d,by,act,note,cls) => ({at:addDays(TODAY,d),by,act,note:note||'',cls:cls||''});
export const QUOTES: any = [
 {id:'Q-0137',cust:'C004',date:addDays(TODAY,-12),by:'S002',lines:[{item:'FG-DB2S',qty:1,price:850000}],disc:12,status:'Rejected',
  history:[H(-12,'S002','Submitted for approval','Customer compared with a local de-foiler; asking 12% to close this month.','info'),H(-11,'S001','Rejected','12% is well above our 5% limit and the competitor is not comparable on build. Offer 5% with free installation instead.','bad')]},
 {id:'Q-0139',cust:'C006',date:addDays(TODAY,-8),by:'S002',lines:[{item:'FG-DBM',qty:1,price:260000},{item:'CP-PVC',qty:1,price:120000}],disc:8,status:'Needs clarification',lead:'L-102',
  history:[H(-8,'S002','Submitted for approval','Nepal customer, first order. Requesting 8% as introductory discount.','info'),H(-7,'S001','More details requested','Before approving 8%: please confirm payment terms (advance %), who pays freight to Kathmandu, and the mould size for the PVC-ALU set.','warn')]},
 {id:'Q-0141',cust:'C002',date:addDays(TODAY,-6),by:'S002',lines:[{item:'CP-ALU',qty:2,price:160000}],disc:5,status:'Sent',lead:'L-103',
  history:[H(-6,'S002','Submitted for approval','Repeat customer, standard 5%.','info'),H(-6,'S001','Approved','Approved within policy.','ok'),H(-5,'S002','Sent to customer','Emailed to engineering manager.','')]},
 {id:'Q-0142',cust:'C007',date:addDays(TODAY,-1),by:'S002',lines:[{item:'FG-EB160',qty:1,price:3200000}],disc:4,status:'Pending approval',lead:'L-101',
  history:[H(-1,'S002','Submitted for approval','Met at CPhi. Customer wants delivery in 10 weeks with FAT at our plant. 4% discount requested.','info')]},
 {id:'Q-0143',cust:'C001',date:addDays(TODAY,0),by:'S002',lines:[{item:'FG-TF',qty:1,price:140000},{item:'CP-PVC',qty:2,price:120000}],disc:7,status:'Pending approval',lead:'L-105',
  history:[H(0,'S002','Submitted for approval','Dealer-referred. Tube feeder plus two mould sets for their existing EB-160. 7% as dealer asked for a package price.','info')]},
 {id:'Q-0144',cust:'C003',date:addDays(TODAY,0),by:'S002',lines:[{item:'CP-ALU',qty:1,price:160000}],disc:0,status:'Draft',history:[H(0,'S002','Draft created','','')]}
];
export const ORDERS: any = [
 {id:'SO-2601',cust:'C003',date:addDays(TODAY,-24),due:addDays(TODAY,6),lines:[{item:'CP-PVC',qty:2,price:120000}],disc:0,advance:true,dispatched:false},
 {id:'SO-2602',cust:'C001',date:addDays(TODAY,-18),due:addDays(TODAY,40),lines:[{item:'FG-EB160',qty:1,price:3200000}],disc:3,advance:true,dispatched:false},
 {id:'SO-2603',cust:'C005',date:addDays(TODAY,-9),due:addDays(TODAY,35),lines:[{item:'FG-EBP',qty:1,price:950000},{item:'FG-DBA',qty:1,price:320000}],disc:2,advance:false,dispatched:false},
 {id:'SO-2604',cust:'C002',date:addDays(TODAY,-15),due:addDays(TODAY,10),lines:[{item:'CP-ALU',qty:3,price:160000}],disc:5,advance:true,dispatched:false},
 {id:'SO-2605',cust:'C008',date:addDays(TODAY,-40),due:addDays(TODAY,2),lines:[{item:'FG-DB4S',qty:1,price:1400000}],disc:0,advance:true,dispatched:false},
 {id:'SO-2598',cust:'C004',date:addDays(TODAY,-75),due:addDays(TODAY,-20),lines:[{item:'FG-EBP',qty:1,price:950000}],disc:0,advance:true,dispatched:true,dispatchDate:addDays(TODAY,-22)}
];
export const STAGES: any = {
  machine:['Design','Material issue','Machining','Fabrication','Assembly','QC / FAT','Ready'],
  part:['Design','Drawing approval','Material issue','CNC machining','Anodising','QC','Ready']
};

export const WOS: any = [
 {id:'WO-3091',so:'SO-2601',item:'CP-PVC',qty:2,stage:4,issued:true},
 {id:'WO-3092',so:'SO-2602',item:'FG-EB160',qty:1,stage:0,issued:false},
 {id:'WO-3093',so:'SO-2604',item:'CP-ALU',qty:3,stage:3,issued:true},
 {id:'WO-3088',so:'SO-2605',item:'FG-DB4S',qty:1,stage:6,issued:true},
 {id:'WO-3079',so:'SO-2598',item:'FG-EBP',qty:1,stage:6,issued:true}
];
export const PRS: any = [];

export const INSTALLED: any = [
 {serial:'MT-EBP-2019-041',item:'FG-EBP',cust:'C002',installed:addDays(TODAY,-2100),amcTo:addDays(TODAY,210)},
 {serial:'MT-DBA-2020-017',item:'FG-DBA',cust:'C006',installed:addDays(TODAY,-1700),amcTo:addDays(TODAY,-44)},
 {serial:'MT-EB160-2021-008',item:'FG-EB160',cust:'C003',installed:addDays(TODAY,-1450),amcTo:addDays(TODAY,21)},
 {serial:'MT-DB4S-2022-012',item:'FG-DB4S',cust:'C001',installed:addDays(TODAY,-1100),amcTo:addDays(TODAY,160)},
 {serial:'MT-EBP-2023-066',item:'FG-EBP',cust:'C007',installed:addDays(TODAY,-700),amcTo:addDays(TODAY,38)},
 {serial:'MT-DBM-2024-021',item:'FG-DBM',cust:'C005',installed:addDays(TODAY,-420),amcTo:addDays(TODAY,310)},
 {serial:'MT-EBP-2026-179',item:'FG-EBP',cust:'C004',installed:addDays(TODAY,-20),amcTo:addDays(TODAY,345),warranty:true}
];
export const TICKETS: any = [
 {id:'SR-311',serial:'MT-DBA-2020-017',issue:'Pressure roller noise at high speed',opened:addDays(TODAY,-2),status:'Engineer visit scheduled'},
 {id:'SR-309',serial:'MT-EB160-2021-008',issue:'Sealing temperature drift',opened:addDays(TODAY,-6),status:'Spare part shipped'},
 {id:'SR-305',serial:'MT-EBP-2019-041',issue:'HMI recipe backup',opened:addDays(TODAY,-15),status:'Closed'}
];

/* ================= Derived state ================= */
export const orderValue = o => o.lines.reduce((s,l)=>s+l.qty*l.price,0)*(1-(o.disc||0)/100);
export const quoteValue = q => q.lines.reduce((s,l)=>s+l.qty*l.price,0)*(1-(q.disc||0)/100);
export const woKind = w => fgBy[w.item].kind;
export const woStages = w => STAGES[woKind(w)];
export function orderStatus(o){
  if(o.dispatched || o.lines.every(l=>(l.disp||0)>=l.qty)) return {t:'Dispatched',c:'ok'};
  const ws = WOS.filter(w=>w.so===o.id);
  if(readyLines(o).length) return {t:'Ready to dispatch',c:'info'};
  if(o.lines.some(l=>(l.disp||0)>0)) return {t:'Partly dispatched',c:'warn'};
  if(!ws.length) return {t:o.advance?'Open':'Awaiting advance',c:o.advance?'':'warn'};
  if(ws.some(w=>w.stage>0)) return {t:'In production',c:'warn'};
  return {t:'Planned',c:''};
}
export const leadValue = l => l.value!=null ? l.value : fgBy[l.item].price*l.qty;
export const openOrders = () => ORDERS.filter(o=>!o.dispatched);
export function amcStatus(m){
  if(m.pending) return {t:'Installation pending',c:'warn',d:-1e6};
  const d = daysFrom(m.amcTo);
  if(m.warranty) return {t:'Warranty · '+d+' days left',c:'ok',d};
  if(d<0) return {t:'AMC expired '+(-d)+' days ago',c:'bad',d};
  if(d<=60) return {t:'AMC renews in '+d+' days',c:'warn',d};
  return {t:'AMC active',c:'ok',d};
}
export function stockStatus(r){
  if(r.service) return {t:'Job work',c:''};
  if(r.onHand<=0) return {t:'Out of stock',c:'bad'};
  if(r.onHand<r.reorder) return {t:'Below reorder',c:'warn'};
  return {t:'In stock',c:'ok'};
}
// requirement for un-issued work + orders without WOs
export function mrp(orderIds){
  const req = {};
  orderIds.forEach(id=>{
    const o = ORDERS.find(x=>x.id===id); if(!o||o.dispatched) return;
    o.lines.forEach(l=>{
      const w = woOf(o,l);
      if(w && w.issued) return;
      (BOM[l.item]||[]).forEach(b=>{ req[b[1]]=(req[b[1]]||0)+b[2]*l.qty; });
    });
  });
  return Object.entries(req).map(([code,qty])=>{
    const r = rmBy[code]; const onOrder = onOrderQty(code);
    const short = r.service?0:Math.max(0,qty-r.onHand-onOrder);
    return {r,qty,onHand:r.onHand,onOrder,short};
  }).sort((a,b)=>(b.short>0)-(a.short>0) || a.r.cat-b.r.cat);
}

/* ================= vendors ================= */
export const VENDORS: any = [
 {id:'V01',name:'Sri Balaji Steels',city:'Bengaluru',supplies:'SS sheet, tube, MS sections'},
 {id:'V02',name:'Precision Alloys',city:'Hosur',supplies:'Aluminium, SS 316 bar, tool steel'},
 {id:'V03',name:'Automation Components',city:'Bengaluru',supplies:'PLC, HMI, drives, sensors'},
 {id:'V04',name:'Pneumatic Systems',city:'Chennai',supplies:'Cylinders, valves, FRL'},
 {id:'V05',name:'Kaveri Bearings',city:'Bengaluru',supplies:'Bearings, linear guides, chains'},
 {id:'V06',name:'Anodize Tech',city:'Peenya, Bengaluru',supplies:'Hard anodising, heat treatment (job work)'}
];
export const venBy=id=>VENDORS.find(v=>v.id===id);
export const PEND='Pending approval';
export function logD(d,act,note,cls){ const n=new Date(); d.history.push({at:new Date(TODAY),time:n.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}),by:SESSION.user,act,note:note||'',cls:cls||''}); }

/* ================= procurement ================= */
export const INDENTS: any = [
 {id:'IND-0407',date:addDays(TODAY,-18),by:'S005',dept:'Stores & purchase',source:'Material planning',needBy:addDays(TODAY,-4),reason:'Bearings for de-foiler builds',status:'Ordered',
  lines:[{rm:'RM-BRG-6204',qty:100,appr:100,po:100},{rm:'RM-BRG-UCP205',qty:20,appr:20,po:20}],history:[H(-18,'S005','Submitted for approval','','info'),H(-17,'S001','Approved','','ok'),H(-16,'S005','Purchase order created','PO-2610','')]},
 {id:'IND-0408',date:addDays(TODAY,-4),by:'S005',dept:'Stores & purchase',source:'Material planning',needBy:addDays(TODAY,12),reason:'Controls for EB-160 and EZEE BLIST-P builds',status:'Ordered',
  lines:[{rm:'RM-PLC-14IO',qty:2,appr:2,po:2},{rm:'RM-HMI-7',qty:2,appr:2,po:2}],history:[H(-4,'S005','Submitted for approval','HMI below reorder level.','info'),H(-3,'S001','Approved','','ok'),H(-2,'S005','Purchase order created','PO-2609','')]},
 {id:'IND-0409',date:addDays(TODAY,-20),by:'S005',dept:'Stores & purchase',source:'Manual',needBy:addDays(TODAY,-5),reason:'Stock top-up for ALU-ALU plug assist',status:'Rejected',
  lines:[{rm:'RM-PTFE-SH3',qty:10,appr:0,po:0}],history:[H(-20,'S005','Submitted for approval','Stock top-up.','info'),H(-19,'S001','Rejected','Current PTFE stock covers about three months of ALU-ALU mould orders. Raise again when it drops below the reorder level.','bad')]},
 {id:'IND-0410',date:addDays(TODAY,-14),by:'S005',dept:'Stores & purchase',source:'Material planning',needBy:addDays(TODAY,-2),reason:'Mould blocks and tool steel for SO-2601 and SO-2604',status:'Ordered',
  lines:[{rm:'RM-AL6061-PL25',qty:100,appr:100,po:100},{rm:'RM-D2-BLK',qty:20,appr:20,po:20}],history:[H(-14,'S005','Submitted for approval','Raised from material planning.','info'),H(-13,'S001','Approved','','ok'),H(-12,'S005','Purchase order created','PO-2608','')]},
 {id:'IND-0411',date:addDays(TODAY,-5),by:'S004',dept:'Production',source:'Manual',needBy:addDays(TODAY,7),reason:'Heater and thermocouple spares for forming and sealing stations',status:'Partly approved',
  lines:[{rm:'RM-HTR-CART',qty:20,appr:12,po:0},{rm:'RM-TCPL-J',qty:6,appr:6,po:0}],history:[H(-5,'S004','Submitted for approval','Two EB-160 builds coming up; we want spares on the shelf.','info'),H(-4,'S001','Partly approved','Approved 12 heaters, not 20. We already hold 20 in stock and the second EB-160 is not confirmed yet.','warn')]},
 {id:'IND-0412',date:addDays(TODAY,-1),by:'S005',dept:'Stores & purchase',source:'Material planning',needBy:addDays(TODAY,10),reason:'Shortages for open sales orders',status:PEND,
  lines:[{rm:'RM-SS316-RD60',qty:20,appr:20,po:0},{rm:'RM-LMG-20',qty:4,appr:4,po:0},{rm:'RM-SERVO-1K',qty:1,appr:1,po:0}],history:[H(-1,'S005','Submitted for approval','Material planning shows these short for SO-2602 and SO-2603.','info')]}
];
export const POS: any = [
 {id:'PO-2608',date:addDays(TODAY,-12),vendor:'V02',indent:'IND-0410',due:addDays(TODAY,-2),status:'Partly received',
  lines:[{rm:'RM-AL6061-PL25',qty:100,rate:480,recv:96,rej:4},{rm:'RM-D2-BLK',qty:20,rate:650,recv:0,rej:0}],
  history:[H(-12,'S005','Created and submitted','From IND-0410.','info'),H(-12,'S001','Approved','','ok'),H(-3,'S009','Goods received','GRN-0777: 96 kg accepted, 4 kg rejected.','warn')]},
 {id:'PO-2609',date:addDays(TODAY,-2),vendor:'V03',indent:'IND-0408',due:addDays(TODAY,12),status:PEND,
  lines:[{rm:'RM-PLC-14IO',qty:2,rate:37500,recv:0,rej:0},{rm:'RM-HMI-7',qty:2,rate:25500,recv:0,rej:0}],history:[H(-2,'S005','Created and submitted','Best of three quotes; 2% below last price.','info')]},
 {id:'PO-2610',date:addDays(TODAY,-16),vendor:'V05',indent:'IND-0407',due:addDays(TODAY,-1),status:'Approved',
  lines:[{rm:'RM-BRG-6204',qty:100,rate:175,recv:0,rej:0},{rm:'RM-BRG-UCP205',qty:20,rate:640,recv:0,rej:0}],history:[H(-16,'S005','Created and submitted','','info'),H(-15,'S001','Approved','','ok')]}
];
export const GATES: any = [
 {id:'GE-0981',dir:'in',date:addDays(TODAY,-3),po:'PO-2608',party:'V02',vehicle:'KA 51 AB 4412',dc:'INV/PA/1187',lines:[{rm:'RM-AL6061-PL25',qty:100}],status:'GRN done',grn:'GRN-0777',history:[H(-3,'S010','Vehicle entered','Invoice INV/PA/1187, 4 bundles.','')]},
 {id:'GE-0982',dir:'in',date:addDays(TODAY,0),po:'PO-2610',party:'V05',vehicle:'KA 04 MN 2290',dc:'DC-5521',lines:[{rm:'RM-BRG-6204',qty:100},{rm:'RM-BRG-UCP205',qty:12}],status:'Awaiting GRN',history:[H(0,'S010','Vehicle entered','Part delivery: 12 of 20 pillow blocks.','')]},
 {id:'GP-0331',dir:'out',returnable:true,date:addDays(TODAY,-6),party:'V06',purpose:'Job work: hard anodising',expBack:addDays(TODAY,2),lines:[{rm:'RM-AL6061-PL25',qty:28,back:14}],status:'Partly returned',
  history:[H(-6,'S005','Submitted for approval','Machined mould blocks for SO-2601 go for hard anodising.','info'),H(-6,'S001','Approved','','ok'),H(-2,'S010','Partly returned','14 kg back; balance promised in two days.','warn')]},
 {id:'GP-0332',dir:'out',returnable:false,date:addDays(TODAY,-1),party:'V02',purpose:'Return of rejected material',ref:'GRN-0777',lines:[{rm:'RM-AL6061-PL25',qty:4,back:0}],status:PEND,
  history:[H(-1,'S005','Submitted for approval','4 kg rejected in GRN-0777 (surface scratches, under thickness). Vendor will replace.','info')]}
];
export const GRNS: any = [
 {id:'GRN-0777',date:addDays(TODAY,-3),gate:'GE-0981',po:'PO-2608',party:'V02',by:'S005',status:'Partly accepted',returnPass:'GP-0332',
  lines:[{rm:'RM-AL6061-PL25',recv:100,acc:96,rej:4,reason:'Surface scratches; thickness 24.4 mm, below tolerance'}],
  history:[H(-3,'S005','Submitted for QC approval','','info'),H(-3,'S009','Partly accepted','4 plates below thickness tolerance; to be returned to the vendor.','warn')]}
];
export const MRS: any = [
 {id:'MR-0558',date:addDays(TODAY,-10),by:'S004',wo:'WO-3093',purpose:'Mould set ×3 for SO-2604',status:'Issued',
  lines:[{rm:'RM-AL6061-PL25',qty:102,appr:102,iss:102},{rm:'RM-D2-BLK',qty:30,appr:30,iss:30}],history:[H(-10,'S004','Submitted for approval','','info'),H(-10,'S001','Approved','','ok'),H(-9,'S005','Material issued','All lines issued in full.','ok')]},
 {id:'MR-0559',date:addDays(TODAY,-4),by:'S004',wo:null,purpose:'Consumables for assembly bay',status:'Partly issued',
  lines:[{rm:'RM-FAST-SS',qty:4,appr:4,iss:2},{rm:'RM-CABLE-15',qty:100,appr:100,iss:100}],history:[H(-4,'S004','Submitted for approval','','info'),H(-4,'S001','Approved','','ok'),H(-3,'S005','Partly issued','Only 2 fastener kits to spare today; rest after next receipt.','warn')]},
 {id:'MR-0560',date:addDays(TODAY,0),by:'S004',wo:'WO-3092',purpose:'EB-160 build for SO-2602: frame and structure',status:PEND,
  lines:BOM['FG-EB160'].slice(0,8).map(b=>({rm:b[1],qty:b[2],appr:b[2],iss:0})),history:[H(0,'S004','Submitted for approval','Frame fabrication starts Monday.','info')]}
];
export let seq={IND:413,PO:2611,GE:983,GP:333,GRN:778,MR:561};
export const nextId = (p,w?) => `${p}-${String(seq[p]++).padStart(w||4,'0')}`;

export function onOrderQty(code){
  let q=0;
  INDENTS.forEach(d=>{ if(d.status==='Rejected') return; d.lines.forEach(l=>{ if(l.rm===code) q += d.status===PEND ? l.qty : Math.max(0,l.appr-l.po); }); });
  POS.forEach(p=>{ if(['Rejected','Short closed'].includes(p.status)) return; p.lines.forEach(l=>{ if(l.rm===code) q+=Math.max(0,l.qty-l.recv); }); });
  return q;
}

/* ================= bomrev ================= */
export const BOMREV: any = {};
FG.forEach(f=>{ if(BOM[f.code]) BOMREV[f.code]=[{ver:1,at:addDays(TODAY,-300),by:'S001',note:'Initial release, derived from published specifications.',n:BOM[f.code].length}]; });
export const bomVer = c => (BOMREV[c]||[]).length ? BOMREV[c][BOMREV[c].length-1] : null;

/* ================= o2c ================= */
export const COMPANY: any = {name:'Mechtek',addr:'Plot No 21/2, Shed No 6, Battarahalli, Virgo Nagar Post, Bengaluru 560049',state:'Karnataka',code:'29',gstin:'29AAAAA0000A1Z5'};
export let GST_RATE = 18;
export const STATES: any = [['Karnataka','29'],['Tamil Nadu','33'],['Kerala','32'],['Andhra Pradesh','37'],['Telangana','36'],['Maharashtra','27'],['Gujarat','24'],['Goa','30'],['Madhya Pradesh','23'],['Himachal Pradesh','02'],['Uttarakhand','05'],['Punjab','03'],['Haryana','06'],['Delhi','07'],['Uttar Pradesh','09'],['Sikkim','11'],['West Bengal','19'],['Telangana','36']].filter((x,i,a)=>a.findIndex(y=>y[0]===x[0])===i);
export const stateCode = n => (STATES.find(s=>s[0]===n)||[,''])[1];
export const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
export const hsnOf = code => fgBy[code].hsn || (fgBy[code].kind==='machine'?'8422 40 00':'8422 90 90');
export const fyTag = () => { const y=TODAY.getMonth()>=3?TODAY.getFullYear():TODAY.getFullYear()-1; return `${String(y).slice(2)}-${String(y+1).slice(2)}`; };

export function supplyType(c){ return c.country!=='India' ? 'export' : (stateCode(c.state)===COMPANY.code ? 'intra' : 'inter'); }
export function taxCalc(taxable,sup){ const g=sup==='export'?0:Math.round(taxable*GST_RATE)/100; return sup==='intra'?{cgst:g/2,sgst:g/2,igst:0,tax:g}:{cgst:0,sgst:0,igst:sup==='inter'?g:0,tax:g}; }
export const lineRate = (o,l) => l.price*(1-(o.disc||0)/100);
export const DCS: any = [];
export const INVOICES: any = [];
export const invPaid = v => v.pays.reduce((s,p)=>s+p.amt,0);
export const invBal = v => Math.max(0, Math.round((v.total - v.advAdj - invPaid(v))*100)/100);
export function invStatus(v){ const b=invBal(v); if(b<=0.5) return {t:'Paid',c:'ok'}; if(invPaid(v)+v.advAdj>0) return {t:daysFrom(v.due)<0?'Partly paid · overdue':'Partly paid',c:daysFrom(v.due)<0?'bad':'warn'}; return daysFrom(v.due)<0?{t:'Overdue',c:'bad'}:{t:'Unpaid',c:'info'}; }
export const advLeft = o => Math.max(0,(o.advanceAmt||0) - INVOICES.filter(v=>v.so===o.id).reduce((s,v)=>s+v.advAdj,0));

export function makeInvoice(o,lines,meta,date){
  const c=custBy(o.cust); const sup=supplyType(c);
  const ls=lines.map(x=>{ const l=x.ln!=null?o.lines[x.ln]:o.lines.find(y=>y.item===x.item); const rate=lineRate(o,l); return {incl:!!l.incl,kid:isKid(l),item:x.item,hsn:hsnOf(x.item),qty:x.qty,list:l.price,disc:o.disc||0,rate,taxable:Math.round(rate*x.qty*100)/100}; });
  const taxable=ls.reduce((s,l)=>s+l.taxable,0); const t=taxCalc(taxable,sup); const total=Math.round(taxable+t.tax);
  const v={id:`MT/${fyTag()}/${String(SEQ.inv++).padStart(4,'0')}`,date:date||new Date(TODAY),due:addDays(date||TODAY,custBy(o.cust).creditDays||30),so:o.id,cust:o.cust,custPO:o.custPO,lines:ls,sup,taxable,...t,roundOff:Math.round((total-taxable-t.tax)*100)/100,total,advAdj:0,pays:[],...meta};
  v.advAdj=Math.min(advLeft(o),v.total); INVOICES.push(v); return v;
}
// migrate sample orders
ORDERS.forEach((o,i)=>{ o.lines.forEach(l=>l.disp=o.dispatched?l.qty:0); o.custPO=o.custPO||`PO/${custBy(o.cust).name.split(' ')[0].toUpperCase().slice(0,5)}/${2400+i*37}`; o.custPODate=addDays(o.date,-2); o.advancePct=30; o.advanceAmt=o.advance?Math.round(orderValue(o)*(supplyType(custBy(o.cust))==='export'?1:1.18)*0.3):0; o.payments=o.advance?[{date:addDays(o.date,3),amt:o.advanceAmt,mode:'NEFT',ref:'UTR'+(880000+i*1117)}]:[]; });
(function(){ const o=ORDERS.find(x=>x.id==='SO-2598'); const dc={id:'DC-0117',date:o.dispatchDate,so:o.id,lines:[{item:'FG-EBP',qty:1}],vehicle:'KA 51 C 9021',transporter:'VRL Logistics',lr:'LR 55812',ewb:'2718 4455 9012',sb:''};
  DCS.push(dc); const v=makeInvoice(o,dc.lines,{dc:dc.id,vehicle:dc.vehicle,transporter:dc.transporter,lr:dc.lr,ewb:dc.ewb,sb:''},o.dispatchDate); dc.inv=v.id; SEQ.inv=Math.max(SEQ.inv,46);
  const bal=invBal(v); v.pays.push({date:addDays(o.dispatchDate,12),amt:bal,mode:'RTGS',ref:'UTR991827'}); })();

/* ================= purchase ================= */
[['V01','Karnataka','29AAFCS5501K1Z3','Ramesh B','90000 20101',30],['V02','Tamil Nadu','33AAGCP7702M1Z8','Selvam K','90000 20102',45],['V03','Karnataka','29AABCA8803N1Z2','Priya D','90000 20103',30],
 ['V04','Tamil Nadu','33AACCP9904P1Z6','Arun M','90000 20104',30],['V05','Karnataka','29AADCK1105Q1Z4','Manoj R','90000 20105',15],['V06','Karnataka','29AAECA2206R1Z9','Shobha N','90000 20106',30]]
 .forEach(([id,state,gstin,contact,phone,terms])=>Object.assign(venBy(id),{state,gstin,contact,phone,terms,email:contact.split(' ')[0].toLowerCase()+'@vendor.demo',active:true}));

export const venTax = v => stateCode(v.state)===COMPANY.code ? 'intra' : 'inter';
export function venRating(id){
  const g=GRNS.filter(x=>x.party===id&&x.status!=='Pending QC approval'); const rec=g.reduce((s,x)=>s+x.lines.reduce((a,l)=>a+l.recv,0),0), acc=g.reduce((s,x)=>s+x.lines.reduce((a,l)=>a+l.acc,0),0);
  const ins=GATES.filter(x=>x.dir==='in'&&x.party===id); const onT=ins.filter(x=>{const p=POS.find(y=>y.id===x.po);return p&&x.date<=p.due}).length;
  return {acc:rec?acc/rec*100:null, ontime:ins.length?onT/ins.length*100:null, n:ins.length};
}
export const pct = v => v==null?'—':Math.round(v)+'%';
export const poLineStatus = (p,l) => p.status==='Short closed'&&l.recv<l.qty?{t:'Short closed',c:''}:l.recv>=l.qty?{t:'Received',c:'ok'}:l.recv>0?{t:'Part received',c:'warn'}:p.status===PEND?{t:'Awaiting approval',c:'info'}:p.status==='Rejected'?{t:'Rejected',c:'bad'}:daysFrom(p.due)<0?{t:'Overdue',c:'bad'}:{t:'Pending',c:''};
export function poTotals(p){ const v=venBy(p.vendor); const taxable=p.lines.reduce((s,l)=>s+l.qty*l.rate,0); const t=taxCalc(taxable,venTax(v)); return {taxable,...t,total:Math.round(taxable+t.tax),sup:venTax(v)}; }

/* bills & debit notes */
export const BILLS: any = [{id:'BILL-0301',vinv:'PA/INV/1187',vdate:addDays(TODAY,-3),date:addDays(TODAY,-2),vendor:'V02',grn:'GRN-0777',po:'PO-2608',status:PEND,match:'On hold: mismatch',
  lines:[{rm:'RM-AL6061-PL25',qty:100,rate:480,poRate:480,accQty:96}],pays:[],history:[H(-2,'S011','Booked, on hold','Vendor billed 100 kg; GRN accepted 96 kg. 4 kg was rejected for thickness.','warn')]}];
BILLS.forEach(b=>{ const g=GRNS.find(x=>x.id===b.grn); g.lines.forEach(l=>{ const bl=b.lines.find(y=>y.rm===l.rm); l.billed=(l.billed||0)+(bl?Math.min(bl.qty,l.acc):0); }); });
export const DEBITS: any = [{id:'DN-0050',date:addDays(TODAY,-20),vendor:'V02',ref:'BILL-0296',reason:'SS 316 round bar: 4 kg billed but not accepted',taxable:2160,tax:388.8,total:2549}];
export function billCalc(b){ const v=venBy(b.vendor); const taxable=b.lines.reduce((s,l)=>s+(l.amt!=null?l.amt:l.qty*l.rate),0); const t=taxCalc(taxable,venTax(v)); return {taxable,...t,total:Math.round(taxable+t.tax)}; }
export const billPayable = b => b.status==='Rejected'?0:(b.approvedTotal!=null?b.approvedTotal:billCalc(b).total);
export const billPaid = b => b.pays.reduce((s,p)=>s+p.amt,0);
export const billBal = b => Math.max(0,Math.round((billPayable(b)-billPaid(b))*100)/100);
export function billStatus(b){ if(b.status===PEND) return {t:'On hold: mismatch',c:'warn'}; if(b.status==='Rejected') return {t:'Rejected',c:'bad'}; const bal=billBal(b); if(bal<=0.5) return {t:'Paid',c:'ok'}; if(billPaid(b)>0) return {t:'Partly paid',c:'warn'}; const due=addDays(b.vdate,venBy(b.vendor).terms||30); return daysFrom(due)<0?{t:'Overdue',c:'bad'}:{t:b.match==='Matched'?'Matched · to pay':'Approved · to pay',c:'info'}; }

/* ================= mr ================= */
export function mrReceipt(m){ const iss=m.lines.reduce((s,l)=>s+l.iss,0); if(!iss) return null; const done=m.lines.reduce((s,l)=>s+(l.rcv||0)+(l.rrej||0),0); const rej=m.lines.reduce((s,l)=>s+(l.rrej||0),0);
  if(done<=0) return {t:'Awaiting confirmation',c:'info'}; if(done<iss) return {t:'Partly confirmed',c:'warn'}; return rej>0?{t:'Received, part rejected',c:'warn'}:{t:'Received in full',c:'ok'}; }
MRS.forEach(m=>m.lines.forEach(l=>{ if(m.id==='MR-0558'){ l.rcv=l.iss; l.rrej=0; } else { l.rcv=l.rcv||0; l.rrej=l.rrej||0; } }));
{ const m=MRS.find(x=>x.id==='MR-0559'); if(m){ m.lines[1].rcv=95; m.lines[1].rrej=5; m.lines[1].rreason='5 m cable with damaged insulation'; m.history.push(H(-3,'S004','Receipt confirmed, part rejected','5 m of cable returned to stores: damaged insulation.','warn')); } }

/* ================= stores ================= */
export const BIN_BY_CAT: any = ['Rack A · sheet & structure','Rack B · bar & block','Cage C · drives & bearings','Rack D · pneumatics','Cage E · electrical','Rack F · heating','Bay G · hardware & packing','—'];
export const LEAD_BY_CAT: any = [7,10,21,10,15,7,5,0];
export const VEN_BY_CAT: any = ['V01','V02','V05','V04','V03','V03','V01','V06'];
RM.forEach((r,i)=>{ if(r.bin==null){ r.bin=r.service?'—':`${BIN_BY_CAT[r.cat].split(' ·')[0]}-${String(i+1).padStart(2,'0')}`; r.lead=LEAD_BY_CAT[r.cat]; r.max=r.service?0:Math.ceil(r.reorder*2.5); r.vendor=['RM-MTR-AC05G','RM-MTR-GM15','RM-SERVO-1K','RM-VFD-05'].includes(r.code)?'V03':VEN_BY_CAT[r.cat]; } });
export const LEDGER: any = [];
export function stockMove(code,q,type,ref,date?,by?){ const r=rmBy[code]; if(!r||r.service||!q) return; r.onHand=Math.round((r.onHand+q)*1000)/1000; const n=new Date();
  LEDGER.push({at:date||new Date(TODAY),time:date?'':n.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}),rm:code,type,ref,qin:q>0?q:0,qout:q<0?-q:0,bal:r.onHand,by:by||SESSION.user||'S005'}); }
(function seedLedger(){
  const moves=[[-9,'RM-AL6061-PL25',-102,'Issue to production','MR-0558 · WO-3093','S005'],[-9,'RM-D2-BLK',-30,'Issue to production','MR-0558 · WO-3093','S005'],
    [-3,'RM-AL6061-PL25',96,'GRN receipt','GRN-0777 · PO-2608','S009'],[-3,'RM-FAST-SS',-2,'Issue to production','MR-0559','S005'],[-3,'RM-CABLE-15',-100,'Issue to production','MR-0559','S005'],[-3,'RM-CABLE-15',5,'Returned by production','MR-0559: damaged insulation','S004']];
  RM.filter(r=>!r.service).forEach(r=>{ const mv=moves.filter(m=>m[1]===r.code); let bal=r.onHand-mv.reduce((s,m)=>s+m[2],0);
    LEDGER.push({at:addDays(TODAY,-30),time:'',rm:r.code,type:'Balance brought forward',ref:'Opening',qin:bal,qout:0,bal,by:'S005'});
    mv.forEach(m=>{ bal+=m[2]; LEDGER.push({at:addDays(TODAY,m[0]),time:'',rm:r.code,type:m[3],ref:m[4],qin:m[2]>0?m[2]:0,qout:m[2]<0?-m[2]:0,bal,by:m[5]}); }); });
})();
export const reservedQty = code => MRS.filter(m=>['Approved','Partly approved','Partly issued','Needs clarification'].includes(m.status)).reduce((s,m)=>s+m.lines.filter(l=>l.rm===code).reduce((a,l)=>a+Math.max(0,l.appr-l.iss),0),0);
export const availQty = code => rmBy[code].onHand - reservedQty(code);
export const ADJS: any = [{id:'ADJ-0012',date:addDays(TODAY,-1),by:'S005',rm:'RM-PAINT-PU',system:20,counted:18,reason:'Two tins found dented and leaking during monthly count; scrapped.',status:PEND,history:[H(-1,'S005','Submitted for approval','Monthly cycle count, Bay G.','info')]}];

MRS.forEach(m=>m.lines.forEach(l=>{ l.ind=l.ind||null; }));

export function planRows(){
  const dem={}; openOrders().forEach(o=>o.lines.forEach(l=>{ if((l.disp||0)>=l.qty) return; const w=woOf(o,l); if(w&&(w.issued||MRS.some(m=>m.wo===w.id&&m.status!=='Rejected'))) return; (BOM[l.item]||[]).forEach(b=>{ dem[b[1]]=(dem[b[1]]||0)+b[2]*l.qty; }); }));
  return RM.filter(r=>!r.service).map(r=>{ const res=reservedQty(r.code), oo=onOrderQty(r.code), need=dem[r.code]||0; const proj=r.onHand+oo-res-need;
    const sug=proj<r.reorder?Math.ceil(Math.max(r.max,r.reorder)-proj):0; const why=need>0&&r.onHand+oo-res<need?'Order demand':proj<r.reorder?'Below reorder level':'Covered';
    return {r,res,oo,need,proj,sug,why}; });
}

/* ---------- Views ---------- */
export function storesInbox(){
  const rows=[];
  MRS.filter(m=>['Approved','Partly approved','Partly issued'].includes(m.status)&&m.lines.some(l=>l.appr-l.iss>0)).forEach(m=>{
    const waiting=m.lines.filter(l=>l.appr-l.iss>0&&l.ind); const nowOk=waiting.filter(l=>rmBy[l.rm].onHand>=(l.appr-l.iss));
    rows.push([nowOk.length?'bad':'warn',nowOk.length?`Stock has arrived for ${m.id}: ${nowOk.length} line${nowOk.length>1?'s':''} can be issued now`:`${m.id} from ${USERS[m.by].name}: ${m.purpose}`,m.wo||'Shop floor','mr-respond',m.id,nowOk.length?'Issue now':'Respond']); });
  INDENTS.filter(d=>d.status===PEND&&d.dept!=='Stores & purchase').forEach(d=>{ const inSt=d.lines.filter(l=>availQty(l.rm)>=l.qty).length; rows.push([inSt?'warn':'',`${d.id} from ${d.dept} (${USERS[d.by].name}): ${inSt} of ${d.lines.length} line${d.lines.length>1?'s':''} already available in stock`,'Shop floor','indent-detail',d.id,'Check']); });
  MRS.filter(m=>m.status==='Needs clarification').forEach(m=>rows.push(['',`${m.id}: waiting for ${USERS[m.by].name} to answer your question`,'Shop floor','mr-detail',m.id,'Open']));
  MRS.filter(m=>m.status===PEND).forEach(m=>rows.push(['',`${m.id} from ${USERS[m.by].name} is with the production supervisor for approval`,'Shop floor','mr-detail',m.id,'Open']));
  GATES.filter(g=>g.dir==='in'&&g.status==='Awaiting GRN').forEach(g=>rows.push(['warn',`${g.id}: ${venBy(g.party).name} material at the gate, waiting for GRN`,'Receipt','new-grn',g.id,'Create GRN']));
  GRNS.filter(g=>g.status==='Pending QC approval').forEach(g=>rows.push(['info',`${g.id} is with QC for inspection`,'Receipt','grn-detail',g.id,'Open']));
  GRNS.filter(g=>g.lines.some(l=>l.rej>0)&&!g.returnPass&&g.status!=='Pending QC approval').forEach(g=>rows.push(['warn',`${g.id}: rejected material to return to ${venBy(g.party).name}`,'Returns','grn-detail',g.id,'Return']));
  GATES.filter(g=>g.returnable&&['Out, awaiting return','Partly returned'].includes(g.status)).forEach(g=>rows.push([daysFrom(g.expBack)<0?'bad':'',`${g.id}: ${g.purpose} with ${venBy(g.party).name}, due back ${ds(g.expBack)}`,'Job work','gate-detail',g.id,'Open']));
  const low=planRows().filter(x=>x.sug>0); if(low.length) rows.push(['warn',`${low.length} materials need replenishing (reorder level or order demand)`,'Planning','go-planning','','Plan']);
  ADJS.filter(a=>a.status===PEND).forEach(a=>rows.push(['info',`${a.id}: stock adjustment for ${rmBy[a.rm].name} waiting for approval`,'Inventory','adj-detail',a.id,'Open']));
  return rows;
}

/* ================= uom ================= */
export const ALT_UNITS: any = {
 'RM-SS304-SH20':[['sheet 1250×2500',49.56]], 'RM-SS304-SH15':[['sheet 1250×2500',37.17]],
 'RM-SS304-SQ40':[['length 6 m',6],['kg',0.4184]], 'RM-MS-ISMC100':[['m',9.56],['length 6 m',57.36]], 'RM-MS-PL12':[['plate 1250×2500',294.38]],
 'RM-PC-GUARD6':[['sheet 1220×2440',2.977]], 'RM-AL6061-PL25':[['block 300×300',6.075],['plate 1220×2440',200.93]], 'RM-AL6061-RD':[['m',5.30],['length 3 m',15.90]],
 'RM-SS316-RD60':[['m',22.62],['piece 300 mm',6.79]], 'RM-EN8-RD':[['m',9.86],['length 6 m',59.16]], 'RM-D2-BLK':[['block 200×100×50',7.70]],
 'RM-BRASS-RD':[['m',4.17]], 'RM-POM-RD':[['m',2.77]], 'RM-PTFE-SH3':[['sheet 1000×1000',6.60]], 'RM-PU-8':[['roll 100 m',100]], 'RM-CABLE-15':[['coil 100 m',100]],
 'RM-PAINT-PU':[['tin 4 L',4]], 'RM-BRG-6204':[['box of 10',10]], 'RM-PROX':[['box of 5',5]]
};
RM.forEach(r=>{ if(!r.alt) r.alt=(ALT_UNITS[r.code]||[]).map(([u,f])=>({u,f})); });
export const uomsOf = code => [{u:rmBy[code].uom,f:1},...(rmBy[code].alt||[])];
export const uf = (code,u) => (uomsOf(code).find(x=>x.u===u)||{f:1}).f;
export const pieceUnit = (code,u) => u!==rmBy[code].uom && !['kg','m','L','m²'].includes(u);
export const roundQ = (code,u,q) => pieceUnit(code,u)?Math.ceil(q-1e-9):Math.round(q*100)/100;
export const altHint = (code,qb) => { const a=(rmBy[code].alt||[])[0]; return a&&qb?`≈ ${qfmt(Math.round(qb/a.f*100)/100)} × ${a.u}`:''; };
export const kgF = code => { const r=rmBy[code]; if(r.uom==='kg') return 1; const a=(r.alt||[]).find(x=>x.u==='kg'); return a?a.f:null; };
POS.forEach(p=>p.lines.forEach(l=>{ if(!l.ou){ l.ou=rmBy[l.rm].uom; l.of=1; l.oq=l.qty; l.orate=l.rate; } }));
/* sample: sheets ordered, billed by weight */
(function(){
  const f=uf('RM-SS304-SH20','sheet 1250×2500'); const orate=Math.round(262*f);
  POS.push({id:'PO-2611',date:addDays(TODAY,-6),vendor:'V01',indent:null,reason:'Sheet stock for EZEE BLIST-P frames; vendor supplies full sheets and bills by weight.',due:addDays(TODAY,1),status:'Approved',
    lines:[{rm:'RM-SS304-SH20',qty:10*f,rate:orate/f,ou:'sheet 1250×2500',of:f,oq:10,orate,recv:0,rej:0}],history:[H(-6,'S005','Created and submitted','Ordered as 10 full sheets.','info'),H(-5,'S001','Approved','','ok')]});
  GATES.push({id:'GE-0983',dir:'in',date:new Date(TODAY),po:'PO-2611',party:'V01',vehicle:'KA 50 M 7781',dc:'SBS/INV/3390 (billed by weight)',lines:[{rm:'RM-SS304-SH20',qty:10*f,gateRej:0,ru:'sheet 1250×2500',rq:10,rrq:0}],status:'Awaiting GRN',history:[H(0,'S010','Vehicle entered','10 sheets on the vehicle; vendor invoice is by weight.','')]});
  seq.PO=Math.max(seq.PO,2612); seq.GE=Math.max(seq.GE,984);
})();
export const DENS: any = [['Mild steel (MS, EN8)',7.85],['Stainless steel 304',7.93],['Stainless steel 316',8.00],['Aluminium 6061',2.70],['Tool steel D2',7.70],['Brass',8.50],['Acetal (POM)',1.41],['PTFE',2.20]];
export function parseAlt(txt,base){
  const out=[]; let err='';
  txt.split('\n').map(x=>x.trim()).filter(Boolean).forEach(line=>{ const k=line.lastIndexOf('='); const u=k>0?line.slice(0,k).trim():''; const f=k>0?parseFloat(line.slice(k+1)):NaN;
    if(!u||!(f>0)) err=`"${line}" should look like: unit name = number`; else if(u===base) err=`"${u}" is the base unit already.`; else if(out.some(x=>x.u===u)) err=`"${u}" is listed twice.`; else out.push({u,f}); });
  return {out,err};
}

/* ================= combos ================= */
export const CHILD_ITEMS: any = [
 {code:'SP-KIT-BL',name:'Commissioning spares kit, blister machine',family:'Spares',kind:'spare',src:'Bought-out',price:45000,hsn:'8422 90 90',sub:'Heater cartridges, thermocouples, sealing O-rings, fuses, proximity sensor'},
 {code:'SP-KIT-DF',name:'Commissioning spares kit, de-foiling machine',family:'Spares',kind:'spare',src:'Bought-out',price:22000,hsn:'8422 90 90',sub:'Pressure-roller sleeve, springs, drive belt, sensor, fuses'},
 {code:'SP-KIT-LAB',name:'Commissioning spares kit, lab de-foiler',family:'Spares',kind:'spare',src:'Bought-out',price:8500,hsn:'8422 90 90',sub:'Roller sleeve, springs, fuses'},
 {code:'SP-2Y-BL',name:'Two-year recommended spares, blister machine',family:'Spares',kind:'spare',src:'Bought-out',price:185000,hsn:'8422 90 90',sub:'Heaters, thermocouples, solenoid valves, cylinder seal kits, SSRs, bearings'},
 {code:'SP-2Y-DF',name:'Two-year recommended spares, de-foiling machine',family:'Spares',kind:'spare',src:'Bought-out',price:65000,hsn:'8422 90 90',sub:'Roller sleeves, bearings, solenoid valve, belts, sensors'},
 {code:'SP-PUNCH',name:'Spare punching tool (D2, hardened)',family:'Spares',kind:'spare',src:'Made with the change parts',price:38000,hsn:'8422 90 90',sub:'Punch and die for the same blister format'},
 {code:'SP-SEAL',name:'Spare sealing plate, knurled',family:'Spares',kind:'spare',src:'Made with the change parts',price:26000,hsn:'8422 90 90',sub:'Upper sealing plate for the same format'},
 {code:'SP-EMB-INS',name:'Batch-code embossing inserts',family:'Spares',kind:'spare',src:'Made with the change parts',price:6500,hsn:'8422 90 90',sub:'Batch no., Mfg and Exp character inserts'},
 {code:'SP-CTN-BKT',name:'Spare carton buckets (set of 10)',family:'Spares',kind:'spare',src:'Made with the change parts',price:18000,hsn:'8422 90 90',sub:'For the same carton size'},
 {code:'AC-CHILL',name:'Water chiller 1.5 TR with SS tank',family:'Accessories',kind:'accessory',src:'Bought-out',price:165000,hsn:'8418 69 90',sub:'Cooling water at 10–15 °C for forming and sealing stations'},
 {code:'AC-COMP',name:'Oil-free air compressor with dryer, 5 HP',family:'Accessories',kind:'accessory',src:'Bought-out',price:240000,hsn:'8414 80 90',sub:'Dry compressed air at 6–9 bar'},
 {code:'AC-EMB',name:'Batch coding and embossing unit',family:'Accessories',kind:'accessory',src:'Built with the machine',price:55000,hsn:'8422 90 90',sub:'Embosses batch, Mfg and Exp on the lidding foil'},
 {code:'AC-PERF',name:'Perforation (tear-line) station',family:'Accessories',kind:'accessory',src:'Built with the machine',price:85000,hsn:'8422 90 90',sub:'Child-resistant or unit-dose tear lines'},
 {code:'AC-VIS',name:'Vision inspection with reject',family:'Accessories',kind:'accessory',src:'Bought-out',price:450000,hsn:'9031 49 00',sub:'Empty-pocket and broken-tablet detection, auto reject'},
 {code:'AC-CFR',name:'21 CFR Part 11 HMI upgrade',family:'Accessories',kind:'accessory',src:'Built with the machine',price:120000,hsn:'8422 90 90',sub:'User levels, audit trail, electronic batch report'},
 {code:'AC-TRAY',name:'SS 316 collection trays (set of 2)',family:'Accessories',kind:'accessory',src:'Built with the machine',price:18000,hsn:'8422 90 90',sub:'Separate trays for recovered tablets and foil'},
 {code:'DOC-IQOQ',name:'IQ/OQ validation protocol and report',family:'Documents',kind:'doc',src:'Service',price:35000,hsn:'SAC 998349',sub:'Installation and operational qualification documents'},
 {code:'DOC-DRG',name:'Format drawing and design approval',family:'Documents',kind:'doc',src:'Service',price:15000,hsn:'SAC 998349',sub:'Drawing sent to the customer for sign-off before machining'},
 {code:'SV-FAT',name:'Factory acceptance test (FAT) at Mechtek',family:'Services',kind:'service',src:'Service',price:25000,hsn:'SAC 998346',sub:'Trial run with customer foil and product before dispatch'},
 {code:'SV-INST',name:'Installation and commissioning',family:'Services',kind:'service',src:'Service',price:40000,hsn:'SAC 998732',sub:'Engineer visit at the customer site, up to 3 days'},
 {code:'SV-INST-L',name:'Installation and demo, lab model',family:'Services',kind:'service',src:'Service',price:15000,hsn:'SAC 998732',sub:'One-day visit'},
 {code:'SV-TRN',name:'Operator and maintenance training',family:'Services',kind:'service',src:'Service',price:20000,hsn:'SAC 999293',sub:'On site, during commissioning'},
 {code:'SV-TRIAL',name:'Change-part trial and sign-off',family:'Services',kind:'service',src:'Service',price:18000,hsn:'SAC 998732',sub:'Fitment and trial on the customer machine'},
 {code:'SV-AMC',name:'Annual maintenance contract, 1 year',family:'Services',kind:'service',src:'Service',price:90000,hsn:'SAC 998717',sub:'Two preventive visits plus breakdown calls'},
 {code:'SV-AMC-L',name:'Annual maintenance contract, lab model',family:'Services',kind:'service',src:'Service',price:30000,hsn:'SAC 998717',sub:'One preventive visit plus breakdown calls'}
];
CHILD_ITEMS.forEach(c=>{ c.specs=[]; c.url=''; fgBy[c.code]=c; });

// De-foiling format set: a change part made in-house (needs a BOM and a work order)
(function(){
  const f={code:'CP-DFR',name:'De-foiling format set',family:'Change parts',sub:'Roller, magazine and guides for one blister size',kind:'part',price:45000,url:'https://mechtek.in/change-parts/',flag:'Sample change-part set for the de-foiling range. Confirm the scope with Mechtek.',
    specs:[['Set includes','Pressure roller insert, magazine guides, blister nest'],['Made to','Customer blister size'],['Material','SS 316, POM, hard-anodised aluminium'],['Approval','Drawing sign-off before CNC']]};
  FG.push(f); fgBy[f.code]=f;
  BOM['CP-DFR']=[[G.MO,'RM-SS316-RD60',4],[G.MO,'RM-POM-RD',2],[G.MO,'RM-AL6061-PL25',3],[G.JW,'RM-JW-ANOD',3]];
  BOMREV['CP-DFR']=[{ver:1,at:addDays(TODAY,-120),by:'S001',note:'Initial release.',n:BOM['CP-DFR'].length}];
})();

// Combo master: main item → child lines. std = standard scope (pre-ticked), incl = price included in the main item.
export const cl = (item,qty,std,incl,note) => ({item,qty,std,incl,note:note||''});
export const BLIST_STD: any = [cl('CP-PVC',1,1,1,'One format for the customer blister'),cl('SP-KIT-BL',1,1,1),cl('DOC-IQOQ',1,1,1),cl('SV-FAT',1,1,1),cl('SV-INST',1,1,1),cl('SV-TRN',1,1,1)];
export const BLIST_OPT: any = [cl('CP-ALU',1,0,0,'Second format, cold-form ALU-ALU'),cl('FG-TF',1,0,0,'Product feeding'),cl('AC-EMB',1,0,0),cl('AC-PERF',1,0,0),cl('AC-VIS',1,0,0),cl('AC-CFR',1,0,0),cl('AC-CHILL',1,0,0),cl('AC-COMP',1,0,0),cl('SP-2Y-BL',1,0,0),cl('SV-AMC',1,0,0,'Starts after warranty')];
export const COMBOS: any = {
 'FG-EB160':{rev:1,lines:[...BLIST_STD,...BLIST_OPT].map(x=>({...x}))},
 'FG-EB140':{rev:1,lines:[...BLIST_STD,...BLIST_OPT].map(x=>({...x}))},
 'FG-EBP':{rev:1,lines:[cl('CP-PVC',1,1,1,'One format for the customer blister'),cl('SP-KIT-BL',1,1,1),cl('DOC-IQOQ',1,1,1),cl('SV-INST-L',1,1,1),cl('SV-TRN',1,1,1),
   cl('CP-ALU',1,0,0,'Second format, cold-form ALU-ALU'),cl('AC-EMB',1,0,0),cl('AC-CFR',1,0,0),cl('AC-CHILL',1,0,0),cl('AC-COMP',1,0,0),cl('SV-AMC-L',1,0,0,'Starts after warranty')]},
 'FG-DB4S':{rev:1,lines:[cl('CP-DFR',1,1,1,'One blister size'),cl('SP-KIT-DF',1,1,1),cl('DOC-IQOQ',1,1,1),cl('SV-FAT',1,1,1),cl('SV-INST',1,1,1),cl('SV-TRN',1,1,1),
   cl('AC-TRAY',1,0,0),cl('AC-CFR',1,0,0),cl('AC-COMP',1,0,0),cl('SP-2Y-DF',1,0,0),cl('SV-AMC',1,0,0,'Starts after warranty')]},
 'FG-DB2S':{rev:1,lines:[cl('CP-DFR',1,1,1,'One blister size'),cl('SP-KIT-DF',1,1,1),cl('DOC-IQOQ',1,1,1),cl('SV-INST',1,1,1),cl('SV-TRN',1,1,1),
   cl('AC-TRAY',1,0,0),cl('AC-CFR',1,0,0),cl('AC-COMP',1,0,0),cl('SP-2Y-DF',1,0,0),cl('SV-AMC',1,0,0,'Starts after warranty')]},
 'FG-DBA':{rev:1,lines:[cl('CP-DFR',1,1,1,'One blister size'),cl('SP-KIT-LAB',1,1,1),cl('DOC-IQOQ',1,1,1),cl('SV-INST-L',1,1,1),
   cl('AC-TRAY',1,0,0),cl('SV-AMC-L',1,0,0,'Starts after warranty')]},
 'FG-DBM':{rev:1,lines:[cl('CP-DFR',1,1,1,'One blister size'),cl('SP-KIT-LAB',1,1,1),cl('SV-INST-L',1,1,1),
   cl('DOC-IQOQ',1,0,0),cl('AC-TRAY',1,0,0),cl('SV-AMC-L',1,0,0,'Starts after warranty')]},
 'CP-PVC':{rev:1,lines:[cl('DOC-DRG',1,1,1),cl('SP-EMB-INS',1,1,1),cl('SV-TRIAL',1,1,1),cl('SP-PUNCH',1,0,0),cl('SP-SEAL',1,0,0)]},
 'CP-ALU':{rev:1,lines:[cl('DOC-DRG',1,1,1),cl('SP-EMB-INS',1,1,1),cl('SV-TRIAL',1,1,1),cl('SP-PUNCH',1,0,0),cl('SP-SEAL',1,0,0)]},
 'CP-CTN':{rev:1,lines:[cl('DOC-DRG',1,1,1),cl('SV-TRIAL',1,1,1),cl('SP-CTN-BKT',1,0,0)]},
 'CP-DFR':{rev:1,lines:[cl('DOC-DRG',1,1,1),cl('SV-TRIAL',1,0,0)]}
};
Object.values(COMBOS).forEach(c=>{ c.hist=[{at:addDays(TODAY,-60),by:'S001',note:'Initial combo set from the standard scope of supply.'}]; });

// Module, route and role access
ROLES.forEach(r=>{ if(!r.perms.combos||r.perms.combos==='none') r.perms.combos = r.perms.products==='full'?'full':(r.perms.products==='view'||r.perms.quotes!=='none')?'view':'none'; });

export const KIND_LBL: any = {machine:'Machine',part:'Change part',spare:'Spares',accessory:'Accessory',service:'Service',doc:'Document'};
export function kindLabel(code){ const f=fgBy[code]; if(!f) return ''; return f.family==='Accessory'?'Accessory':(KIND_LBL[f.kind]||f.kind); }
export function mk(l){ const f=fgBy[l.item]; return !!f&&(f.kind==='machine'||f.kind==='part'); }
export function woOf(o,l){ const ln=o.lines.indexOf(l); return WOS.find(w=>w.so===o.id&&w.item===l.item&&(w.ln===undefined||w.ln===ln)); }
export function isKid(l){ return l.pi!==undefined&&l.pi!==null; }
// Child items ship with their main item: ready when the main item's work order is ready.
export function readyLines(o){ return o.lines.filter(l=>{
  if((l.disp||0)>=l.qty) return false;
  const done = x => { const w=woOf(o,x); return !!w&&w.stage===woStages(w).length-1; };
  if(mk(l)) return done(l);
  const p=isKid(l)?o.lines[l.pi]:null;
  return p&&mk(p) ? done(p) : true; }); }

/* ================= crm ================= */
ROLES.forEach(r=>{ const set=(k,v)=>{ if(r.id!=='R01') r.perms[k]=v; };
  set('crm',{R02:'full',R03:'full',R06:'full',R10:'view'}[r.id]||'none');
  set('receivables',{R10:'full',R03:'view',R02:'view'}[r.id]||'none');
  set('payables',{R10:'full',R05:'view'}[r.id]||'none'); });

// ---- Customer credit terms, vendor MSME status
[['C001',30,5000000],['C002',30,4000000],['C003',45,2500000],['C004',30,3000000],['C005',0,0],['C006',0,0],['C007',0,0],['C008',30,1500000]].forEach(([id,d,l])=>Object.assign(custBy(id),{creditDays:d,creditLimit:l}));
[['V04','UDYAM-TN-02-0041187'],['V05','UDYAM-KR-03-0098812'],['V06','UDYAM-KR-03-0012345']].forEach(([id,u])=>Object.assign(venBy(id),{msme:true,udyam:u}));
export const creditTxt = c => c.creditDays ? `${c.creditDays} days${c.creditLimit?` · limit ${inrShort(c.creditLimit)}`:''}` : 'Advance / LC';

// ---- Contacts
export const CONTACTS: any = [
 {id:'P01',cust:'C001',name:'Srinivas Rao',desig:'Purchase head',role:'Purchase',mobile:'98480 11201',email:'srinivas@sunrise.demo',primary:true},
 {id:'P02',cust:'C001',name:'Anitha K',desig:'Plant head',role:'Decision maker',mobile:'98480 11202',email:'anitha@sunrise.demo'},
 {id:'P03',cust:'C001',name:'Ramana V',desig:'Accounts manager',role:'Accounts',mobile:'98480 11203',email:'accounts@sunrise.demo'},
 {id:'P04',cust:'C002',name:'Mahesh Gowda',desig:'Engineering manager',role:'Engineering',mobile:'98450 22101',email:'mahesh@kaveri.demo',primary:true},
 {id:'P05',cust:'C002',name:'Rekha S',desig:'Accounts manager',role:'Accounts',mobile:'98450 22102',email:'rekha@kaveri.demo'},
 {id:'P06',cust:'C003',name:'Harpreet Singh',desig:'Packaging head',role:'Engineering',mobile:'98160 33101',email:'harpreet@nilgiri.demo',primary:true},
 {id:'P07',cust:'C003',name:'Neha Sharma',desig:'Finance controller',role:'Accounts',mobile:'98160 33102',email:'neha@nilgiri.demo'},
 {id:'P08',cust:'C004',name:'Jignesh Patel',desig:'Plant head',role:'Decision maker',mobile:'98250 44101',email:'jignesh@deccan.demo',primary:true},
 {id:'P09',cust:'C004',name:'Hetal Shah',desig:'Accounts payable',role:'Accounts',mobile:'98250 44102',email:'hetal@deccan.demo'},
 {id:'P10',cust:'C005',name:'James Mwangi',desig:'Technical director',role:'Decision maker',mobile:'+254 700 555 101',email:'james@coastal.demo',primary:true},
 {id:'P11',cust:'C006',name:'Bikash Shrestha',desig:'Production manager',role:'Decision maker',mobile:'+977 980 555 1101',email:'bikash@lotus.demo',primary:true},
 {id:'P12',cust:'C007',name:'Nguyen Van Minh',desig:'R&D head',role:'Engineering',mobile:'+84 90 555 1201',email:'minh@mekong.demo',primary:true},
 {id:'P13',cust:'C008',name:'Faisal Ahmed',desig:'Procurement manager',role:'Purchase',mobile:'+971 50 555 1301',email:'faisal@gulfmed.demo',primary:true},
 {id:'P14',cust:'C008',name:'Mariam Khan',desig:'Finance manager',role:'Accounts',mobile:'+971 50 555 1302',email:'mariam@gulfmed.demo'}
];

export const ctBy = id => CONTACTS.find(x=>x.id===id);
export const custContacts = cid => CONTACTS.filter(x=>x.cust===cid);
export const acctContact = cid => custContacts(cid).find(x=>x.role==='Accounts') || custContacts(cid).find(x=>x.primary) || null;
export const CT_ROLES: any = ['Decision maker','Purchase','Engineering','Accounts','Quality','Other'];

// ---- Historical sales on credit, so receivables have real ageing (sample data)
(function(){
  const keepInv=SEQ.inv, keepDc=SEQ.dc;
  const H_SO=[ // [so, cust, order days ago, invoice days ago, lines, invoice no., payments [daysAgo, amount]]
   ['SO-2586','C003',-120,-105,[['CP-PVC',2,120000]],32,[[-40,150000]]],
   ['SO-2588','C004',-140,-128,[['CP-ALU',1,90000]],33,[]],
   ['SO-2590','C001',-85,-70,[['SP-2Y-BL',1,185000],['SV-AMC',1,90000]],34,[]],
   ['SO-2591','C008',-55,-40,[['CP-DFR',2,45000]],35,[]],
   ['SO-2592','C002',-60,-48,[['CP-CTN',2,90000]],36,[[-10,100000]]],
   ['SO-2593','C003',-95,-80,[['SV-AMC',1,90000],['SP-KIT-DF',1,22000]],37,[[-30,132160]]],
   ['SO-2594','C001',-30,-20,[['CP-PVC',1,120000]],38,[]],
   ['SO-2595','C004',-20,-12,[['SP-KIT-BL',2,45000]],39,[]],
   ['SO-2596','C002',-45,-35,[['AC-CHILL',1,165000]],40,[]]];
  let wo=3060;
  H_SO.forEach(([id,cust,od,idays,ls,no,pays],i)=>{
    const o={id,cust,date:addDays(TODAY,od),due:addDays(TODAY,idays),lines:ls.map(([item,qty,price])=>({item,qty,price,disp:qty})),disc:0,advance:true,advanceAmt:0,advancePct:0,payments:[],dispatched:true,dispatchDate:addDays(TODAY,idays),custPO:`PO/${custBy(cust).name.split(' ')[0].toUpperCase().slice(0,5)}/${2100+i*23}`,custPODate:addDays(TODAY,od-2),credit:true};
    o.lines.forEach((l,ln)=>{ if(mk(l)) WOS.push({id:'WO-'+(wo++),so:id,item:l.item,qty:l.qty,stage:6,issued:true,ln}); });
    ORDERS.push(o);
    const dc={id:'DC-00'+(80+i),date:addDays(TODAY,idays),so:id,lines:o.lines.map((l,ln)=>({item:l.item,qty:l.qty,ln})),vehicle:'KA 51 C 90'+(10+i),transporter:'VRL Logistics',lr:'LR 55'+(700+i),ewb:'2718 4455 90'+(10+i),sb:''};
    DCS.push(dc);
    const v=makeInvoice(o,dc.lines,{dc:dc.id,vehicle:dc.vehicle,transporter:dc.transporter,lr:dc.lr,ewb:dc.ewb,sb:''},addDays(TODAY,idays));
    v.id=`MT/26-27/${String(no).padStart(4,'0')}`; v.due=addDays(v.date,custBy(cust).creditDays||30); dc.inv=v.id;
    pays.forEach(([d,amt])=>v.pays.push({date:addDays(TODAY,d),amt:Math.min(amt,v.total),mode:'NEFT',ref:'UTR'+(700000+i*917+(-d))}));
  });
  ORDERS.sort((a,b)=>a.id<b.id?-1:1); INVOICES.sort((a,b)=>a.id<b.id?-1:1);
  SEQ.inv=keepInv; SEQ.dc=keepDc;
})();

// ---- Historical vendor bills (approved and matched), so payables have ageing (sample data)
[['BILL-0288','V01','SBS/2026/0812',-96,[['RM-SS304-SH20',496,262]],[[-40,80000]]],
 ['BILL-0291','V03','AC/INV/5521',-62,[['RM-PLC-14IO',4,18500],['RM-HMI-7',4,24000]],[]],
 ['BILL-0293','V06','AT/JW/318',-50,[['RM-JW-ANOD',60,180],['RM-JW-HT',40,120]],[]],
 ['BILL-0294','V05','KB/2026/1142',-19,[['RM-BRG-6204',120,210],['RM-LMG-20',8,6800]],[]],
 ['BILL-0295','V04','PS/INV/2231',-38,[['RM-CYL-50',10,5400],['RM-SV-52',16,2900]],[[-5,40000]]],
 ['BILL-0296','V02','PA/INV/1142',-27,[['RM-SS316-RD60',180,540]],[]],
 ['BILL-0297','V01','SBS/2026/0901',-8,[['RM-MS-ISMC100',600,78],['RM-SS304-SQ40',120,310]],[]],
 ['BILL-0298','V06','AT/JW/341',-6,[['RM-JW-ANOD',45,180]],[]]]
 .forEach(([id,ven,vinv,d,ls,pays])=>{ if(!venBy(ven)) return; const lines=ls.filter(([rm])=>rmBy[rm]).map(([rm,qty,rate])=>({rm,qty,rate,poRate:rate,accQty:qty}));
   const b={id,vinv,vdate:addDays(TODAY,d),date:addDays(TODAY,d+1),vendor:ven,grn:'GRN-0'+(700+Math.abs(d)%70),po:'PO-25'+(40+Math.abs(d)%50),status:'Approved',match:'Matched',lines,pays:[],history:[H(d+1,'S011','Booked and matched','PO, GRN and bill agree.','ok')]};
   pays.forEach(([pd,amt])=>b.pays.push({date:addDays(TODAY,pd),amt,mode:'NEFT',ref:'UTR'+(880000+Math.abs(pd)*37)}));
   BILLS.unshift(b); });

// ---- Activities: calls, visits, e-mails and follow-ups
export const ACT_TYPES: any = ['Call','Visit','Meeting','Email','WhatsApp','Demo / FAT','Collection call'];
export const mkAct=(o)=>({status:'Done',notes:'',outcome:'',ref:'',...o,id:o.id||'A-'+(SEQ.act++)});
export const invNo = n => `MT/26-27/${String(n).padStart(4,'0')}`;
export const ACTS: any = [
 mkAct({id:'A-490',type:'Visit',cust:'C001',contact:'P02',ref:'L-105',subject:'Plant visit: EB-160 running at 70% speed',notes:'Operators hand-feed tablets. Tube feeder would lift output. Dealer to push package offer.',outcome:'Lead raised',date:addDays(TODAY,-30),by:'S002'}),
 mkAct({id:'A-495',type:'Email',cust:'C003',contact:'P07',ref:invNo(32),subject:'Payment reminder: second reminder',notes:'Sent statement of account with invoice copy.',date:addDays(TODAY,-10),by:'S011'}),
 mkAct({id:'A-497',type:'Visit',cust:'C002',contact:'P04',ref:'Q-0141',subject:'Presented ALU-ALU mould sets',notes:'Mould trial planned on their EZEE BLIST-P/S. Mahesh wants a drawing before PO.',outcome:'Positive',date:addDays(TODAY,-5),by:'S002'}),
 mkAct({id:'A-499',type:'Demo / FAT',cust:'C006',contact:'P11',ref:'L-102',subject:'Video demo of DE-BLIST-M',notes:'Showed recovery on their blister sample. Asked about freight to Kathmandu.',outcome:'Interested',date:addDays(TODAY,-9),by:'S003'}),
 mkAct({id:'A-500',type:'Collection call',cust:'C004',contact:'P09',ref:invNo(33),subject:'Overdue ALU-ALU set invoice',notes:'Hetal says the invoice is approved; payment in the next run.',outcome:'Promise to pay',promise:{date:addDays(TODAY,-2),amt:106200},date:addDays(TODAY,-7),by:'S011'}),
 mkAct({id:'A-501',type:'Call',cust:'C007',contact:'P12',ref:'Q-0142',subject:'FAT dates and delivery',notes:'Wants 10-week delivery and FAT at Mechtek before shipment.',outcome:'Awaiting approval',date:addDays(TODAY,-1),by:'S002'}),
 mkAct({id:'A-502',type:'WhatsApp',cust:'C005',contact:'P10',ref:'SO-2603',subject:'Shared shipping schedule',notes:'Advance still pending from Coastal; James will check with finance.',date:addDays(TODAY,-3),by:'S002'}),
 mkAct({id:'A-503',type:'Collection call',cust:'C001',contact:'P03',ref:invNo(34),subject:'Spares and AMC invoice overdue',notes:'Ramana asked for the AMC schedule copy before release.',outcome:'Documents requested',promise:{date:addDays(TODAY,4),amt:324500},date:addDays(TODAY,-4),by:'S011'}),
 // open follow-ups
 mkAct({id:'A-504',type:'Call',status:'Open',cust:'C007',contact:'P12',ref:'Q-0142',subject:'Confirm FAT slot and advance terms',due:addDays(TODAY,1),by:'S002'}),
 mkAct({id:'A-505',type:'Call',status:'Open',cust:'C002',contact:'P04',ref:'Q-0141',subject:'Chase PO for ALU-ALU sets',due:addDays(TODAY,2),by:'S002'}),
 mkAct({id:'A-506',type:'Collection call',status:'Open',cust:'C004',contact:'P09',ref:invNo(33),subject:'Promise missed: call again',due:addDays(TODAY,0),by:'S011'}),
 mkAct({id:'A-507',type:'Collection call',status:'Open',cust:'C003',contact:'P07',ref:invNo(32),subject:'Balance on PVC-ALU sets',due:addDays(TODAY,-1),by:'S011'}),
 mkAct({id:'A-508',type:'Meeting',status:'Open',cust:'C008',contact:'P13',ref:'SO-2605',subject:'Review DB4S dispatch and installation plan',due:addDays(TODAY,5),by:'S003'}),
 mkAct({id:'A-509',type:'Visit',status:'Open',cust:'C006',contact:'P11',ref:'L-102',subject:'Send revised quote with freight',due:addDays(TODAY,-2),by:'S002'})
];
export const openFollowups = () => ACTS.filter(a=>a.status==='Open');
export const lastAct = (cust,pred) => ACTS.filter(a=>a.cust===cust&&a.status==='Done'&&(!pred||pred(a))).sort((a,b)=>b.date-a.date)[0];
export const refLabel = r => !r?'':/^L-/.test(r)?`Lead ${r}`:/^Q-/.test(r)?`Quote ${r}`:/^SO-/.test(r)?`Order ${r}`:/^MT\//.test(r)?`Invoice ${r}`:r;
export const refRoute = r => !r?null:/^L-/.test(r)?'leads':/^Q-/.test(r)?'quotes':/^SO-/.test(r)?'orders':/^MT\//.test(r)?'receivables':null;
export function custRefs(cid){ return [
  ...LEADS.filter(l=>l.cust===cid&&!['Won','Lost'].includes(l.stage)).map(l=>[l.id,`Lead ${l.id} · ${fgBy[l.item]?fgBy[l.item].name:''}`]),
  ...QUOTES.filter(q=>q.cust===cid&&![QS.conv,QS.rej].includes(q.status)).map(q=>[q.id,`Quote ${q.id} · ${q.status}`]),
  ...ORDERS.filter(o=>o.cust===cid&&!o.dispatched).map(o=>[o.id,`Order ${o.id}`]),
  ...INVOICES.filter(v=>v.cust===cid&&invBal(v)>0).map(v=>[v.id,`Invoice ${v.id} · ${inr(invBal(v))} due`])]; }
export function promiseOf(v){ const a=ACTS.filter(x=>x.ref===v.id&&x.promise).sort((a,b)=>b.date-a.date)[0]; if(!a) return null; const broken=daysFrom(a.promise.date)<0&&invBal(v)>0.5; return {...a.promise,broken,by:a.by}; }

// ---- Ageing helpers
export const BUCKETS: any = ['Not due','1–30','31–60','61–90','Over 90'];
export const bucketOf = od => od<=0?0:od<=30?1:od<=60?2:od<=90?3:4;
export const arOpen = () => INVOICES.filter(v=>invBal(v)>0.5).map(v=>({v,bal:invBal(v),od:-daysFrom(v.due)}));
export const custAdvances = cid => ORDERS.filter(o=>o.cust===cid&&!o.dispatched).reduce((s,o)=>s+advLeft(o),0);
export function apDue(b){ const v=venBy(b.vendor); const days=v.msme?Math.min(v.terms||30,45):(v.terms||30); return addDays(b.vdate,days); }
export const apOpen = () => BILLS.filter(b=>b.status!==PEND&&b.status!=='Rejected'&&billBal(b)>0.5).map(b=>({b,bal:billBal(b),due:apDue(b),od:-daysFrom(apDue(b)),msme:!!venBy(b.vendor).msme}));

/* ================= forecastperms ================= */
ROLES.forEach(r=>{ if(r.id!=='R01') r.perms.forecast={R03:'full',R05:'full',R04:'view',R02:'view',R10:'view'}[r.id]||'none'; });
/* ================= shared ================= */
export const QS = {draft:'Draft',pend:'Pending approval',clar:'Needs clarification',appr:'Approved',rej:'Rejected',sent:'Sent',conv:'Converted'};
export const USERS: any = new Proxy({}, {get:(t,k)=>{ const x=staffBy(k); return x?{name:x.name,title:(roleBy(x.role)||{}).name||x.designation,initials:x.name.split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase(),pass:x.password}:{name:'Unknown',title:'',initials:'?'}; }});
export function logQ(q,act,note,cls){ q.history.push({at:new Date(TODAY),time:nowTime(),by:SESSION.user,act,note:note||'',cls:cls||''}); }

/* ================= lists (editable masters) ================= */
// Drop-down lists kept in the database (Lists screen). The constants above (CATS, DEPTS, STATES, ...)
// are rebuilt in place from these rows, so screens keep reading them as before.
export const UOMS: any = ['kg','m','m²','nos','set','L'];
export const LEAD_SOURCES: any = ['Website','CPhi expo','P-MEC expo','Dealer','Repeat customer','Installed-base alert'];
export const DESIGNATIONS: any = [...new Set(STAFF.map(x=>x.designation))];
export const FAMILIES: any = [...new Set([...FG,...CHILD_ITEMS].map(f=>f.family))];
const named = a => a.map(name=>({code:name,name}));
export const LIST_DATA: Record<string, any[]> = {
  material_categories: CATS.map((name,i)=>({code:String(i),name,bin:BIN_BY_CAT[i],lead:LEAD_BY_CAT[i],vendor:VEN_BY_CAT[i]})),
  uoms: named(UOMS),
  lead_sources: named(LEAD_SOURCES),
  lead_stages: named(LEAD_STAGES),
  activity_types: named(ACT_TYPES),
  contact_roles: named(CT_ROLES),
  departments: named(DEPTS),
  designations: named(DESIGNATIONS),
  states: STATES.map(([name,gstCode])=>({code:gstCode,name,gstCode})),
  company: [{code:'main',name:COMPANY.name,addr:COMPANY.addr,state:COMPANY.state,stateCode:COMPANY.code,gstin:COMPANY.gstin,gstRate:GST_RATE}],
  product_families: named(FAMILIES),
  bom_groups: Object.entries(G).map(([code,name])=>({code,name})),
  item_kinds: Object.entries(KIND_LBL).map(([code,name])=>({code,name})),
};
const fill = (arr, xs) => { arr.length = 0; arr.push(...xs); };
const fillObj = (o, entries) => { for (const k of Object.keys(o)) delete o[k]; entries.forEach(([k,v])=>{ o[k]=v; }); };
/** Rebuild the drop-down constants from LIST_DATA (after loading or editing a list). */
export function rebuildLists(){
  const L = LIST_DATA, names = k => L[k].map(x=>x.name);
  const cats = L.material_categories.slice().sort((a,b)=>+a.code-+b.code);
  fill(CATS, []); fill(BIN_BY_CAT, []); fill(LEAD_BY_CAT, []); fill(VEN_BY_CAT, []); fill(CAT_VAR, []);
  cats.forEach(c=>{ const i=+c.code; CATS[i]=c.name; BIN_BY_CAT[i]=c.bin||'—'; LEAD_BY_CAT[i]=c.lead||0; VEN_BY_CAT[i]=c.vendor||''; CAT_VAR[i]=`--bar-${(i%8)+1}`; });
  fill(UOMS, names('uoms')); fill(LEAD_SOURCES, names('lead_sources')); fill(LEAD_STAGES, names('lead_stages'));
  fill(ACT_TYPES, names('activity_types')); fill(CT_ROLES, names('contact_roles')); fill(DEPTS, names('departments'));
  fill(DESIGNATIONS, names('designations')); fill(FAMILIES, names('product_families'));
  fill(STATES, L.states.map(s=>[s.name,s.gstCode||s.code]));
  fillObj(G, L.bom_groups.map(g=>[g.code,g.name])); fillObj(KIND_LBL, L.item_kinds.map(k=>[k.code,k.name]));
  const c = L.company[0];
  if (c) { Object.assign(COMPANY,{name:c.name||'',addr:c.addr||'',state:c.state||'',code:c.stateCode||'',gstin:c.gstin||''}); if (c.gstRate!=null) GST_RATE=c.gstRate; }
}
