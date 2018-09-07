/* PoolFire.js */

//---------- CONSTANTES --------------------------------------------
const G = 9.80665;             //Aceleración de la gravedad (m/s2)
const R_DRY_AIR = 287.05;     //Constante específica del aire (J/kg*K)
//------------------------------------------------------------------

/* --------------  BURNING RATE (kg/m2*s) con el Método BURGUESS-STRASSER -----------------
 - hVap - Entalpia de vaporizacion (KJ/kg)
 - hComb - Entalpia de combustion (KJ/kg)
 - tAmb - Temperatura ambiente (C)
 - tEbull - Temperatura de ebullicion (K)
 - cP - Capacidad calorica (KJ/kg*K)
 - densLiquid - Densidad del liquido a temperatura de ebullición 
 */
function bRateBurguessStrasser(hVap, hComb,tAmb,tEbull,cP,densLiquid) {
     let c1 = 0.00000127;
     let brate = densLiquid*c1*(hComb/(hVap+cP*(tEbull-(tAmb+273.15))));
     return brate; //(kg/m2*s)
}
