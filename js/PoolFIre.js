/* PoolFire.js */

//---------- CONSTANTES --------------------------------------------
const G = 9.80665; //Aceleración de la gravedad (m/s2)
const R_DRY_AIR = 287.05; //Constante específica del aire (J/kg*K)
//------------------------------------------------------------------

// - tAmb - Temperatura ambiente (C) - API
var tAmb = 12;

var gasoline = data[1361-1].hvtmax;


console.log(`Es la ${gasoline}`);

class PoolFire {
  constructor(hVap) {
    this.hVap = hVap;
    this.bRate = this.bRateBurguessStrasser(this.hVap,2,3,0,5);
 
  }

  /* --------------  BURNING RATE (kg/m2*s) con el Método BURGUESS-STRASSER -----------------
    - hVap - Entalpia de vaporizacion (KJ/kg) - DB
    - hComb - Entalpia de combustion (KJ/kg) - DB
    - tEbull - Temperatura de ebullicion (K) - DB
    - cP - Capacidad calorica (KJ/kg*K) - DB
    - densLiquid - Densidad del liquido a temperatura de ebullición (kg/m3) - DB
    */
  bRateBurguessStrasser(hVap, hComb, tEbull, cP, densLiquid) {
    let c1 = 0.00000127;
    let brate = densLiquid * c1 * (hComb / (hVap + cP * (tEbull - (tAmb + 273.15))));
    return brate; //(kg/m2*s)
  }


  /* ---------------- DIAMETRO MAXIMO DE LA ALBERCA CON FUGA CONTINUA ----------------------
  Se determina hasta alcanzar el equilibrio entre lo consumido y lo fugado
  - spillRate - Fuga del liquido (m3/s)
  - brate - Burning Rate (kg/m2*s)  
  - diameterMax - (m) 
  - liqDens - (kg/m3) de la base de datos  
  */
  diameterForPoolForContinuosLeak(spillRate, liqDens) {
    let diameterMax = 2.0 * Math.sqrt(spillRate / (Math.PI * (this.bRate / liqDens)));
    return diameterMax;
  }
}


var newPF = new PoolFire(23);


console.log(`El Burning Rate es: ${newPF.bRate} kg/m2*s`)
console.log(newPF.diameterForPoolForContinuosLeak(2,2))



/* ---------------- TIEMPO PARA ALCANZAR EL MAXIMO DIAMETRO EN EQUILIBRIO DE UNA FUGA CONTINUA ---------------- 
 - poolSizeForContinuosL - Diamtero determinado del metodo anterior (m)
 - brate - burning rate (kg/m2*s) del metodo anterior
 - density - (kg/m3) de la base de datos  */
function timeToReachPoolSizeForContinuosLeak(dMaxFugaContinua, brate, density) {
  let vf = brate / density; //Regression rate (m/s)
  let teq = 0.564 * (dMaxFugaContinua / (Math.pow((g * vf * dMaxFugaContinua), 1.0 / 3.0)));
  return teq; //(s)
}