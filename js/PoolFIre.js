/* PoolFire.js */

//---------- CONSTANTES --------------------------------------------
const G = 9.80665; //Aceleración de la gravedad (m/s2)
const R_DRY_AIR = 287.05; //Constante específica del aire (J/kg*K)
//------------------------------------------------------------------

//---DATOS DE CLIMA ----
// - tAmb - Temperatura ambiente (C) - API
var tAmbC = 25;
var tAmbK = tAmbC + 273.15;
var velocidadVientoMSEG = 1.5; //Velocidad del viento (m/s)
var altitudMSNM = 2500; //Altitud (msnm)



class PoolFire {
  constructor(sustancia, obj) {
    this.obj = obj; //Objeto que contiene la informacion a pasar en la clase
    //Sustancia
    this.sustancia = sustancia;
    // Entalpia de vaporizacion (kJ/kg) - a la temperatura ambiente dada YAWS - pp109 f(t)
    this.hVapKJKG = ((this.sustancia.hva * Math.pow(1 - (tAmbK / this.sustancia.tc), this.sustancia.hvn)) / this.sustancia.mw) * 1000;
    // Entalpia de Combustion (kJ/kg) - YAWS - pp582 
    this.hCombKJKG = this.sustancia.hckjkg;
    // Temperatura de ebullicion (K)
    this.tEbullK = parseFloat(this.sustancia.tb);
    // - cP - Capacidad calorica (KJ/kg*K) - DB f(T)
    this.cPKJKGK = (parseFloat(this.sustancia.cpla) + parseFloat(this.sustancia.cplb * tAmbK) + parseFloat(this.sustancia.cplc * Math.pow(tAmbK, 2)) + parseFloat(this.sustancia.cpld * Math.pow(tAmbK, 3))) / (this.sustancia.mw)
    //- densLiquid - Densidad del liquido a temperatura de ebullición (kg/m3) - DB f(t) YAWS-pp185
    this.densLiquidATB = this.sustancia.dliqa * Math.pow(this.sustancia.dliqb, -Math.pow((1 - this.sustancia.tb / this.sustancia.tc), this.sustancia.dliqn)) * 1000;
    // Entalpia de vaporizacion (kJ/kg) - a la temperatura de ebullicion CCPS 234 ej
    this.hVapKJKGTB = parseFloat(this.hVapKJKG) + parseFloat(this.cPKJKGK) * (this.tEbullK - tAmbK);

    //-------DATOS DENTRO DEL OBJETO --------
    //¿Fuga continua?
    this.fugaContinua = obj.fugaContinua;
    console.log(this.fugaContinua);
    //Fuga continua (m3/s)
    this.spillRate = obj.spillRate;
    //Fuga Intantanea (m3)
    this.massRelease = obj.massRelease;
    //Area de un dique no circular
    this.areaDiqueNoCircular = obj.areaDiqueNoCircular;


    // TODO: ES MEJOR LLAMAR LA FUNCION DIRECTAMENTE??? Secuencia para calculo asignando funciones a variables
    this.bRate = this.bRateBurguessStrasser();
    this.diameterPoolContinuosLake = this.diameterForPoolForContinuosLeak();
    this.diameterPoolInstantaneousLake = this.diameterForPoolSizeInstantaneousLeak();
    this.tiempoParaALcanzarMaximoDiametroFugaContunua = this.timeToReachPoolSizeForContinuosLeak();

  }

  /* --------------  BURNING RATE (kg/m2*s) con el Método BURGUESS-STRASSER-KAKOSIMOS pp 82 PARA GASES LICUADOS USAR MUDAN KAKOSIMOS pp 83 -----------------
    - hVapKJKG - Entalpia de vaporizacion (KJ/kg) - DB
    - hCombKJKG - Entalpia de combustion (KJ/kg) - DB
    - tEbullK - Temperatura de ebullicion (K) - DB
    - cPKJKGK - Capacidad calorica (KJ/kg*K) - DB
    - densLiquidTB - Densidad del liquido a temperatura de ebullición (kg/m3) - DB
    */
  bRateBurguessStrasser() {
    let c1 = 0.00000127; // m/s KAKOSIMOS pp82
    let brate = this.densLiquidATB * c1 * (this.hCombKJKG / (this.hVapKJKGTB + this.cPKJKGK * (this.tEbullK - (tAmbK))));
    return brate; //(kg/m2*s)
  }
  /* ---------------- DIAMETRO MAXIMO DE LA ALBERCA CON FUGA CONTINUA - CCPS pp 228 y y` 234----------------------
  Se determina hasta alcanzar el equilibrio entre lo consumido y lo fugado
  - spillRate - Fuga del liquido (m3/s)
  - brate - Burning Rate (kg/m2*s)  
  - diameterMax - (m) 
  - liqDens - (kg/m3) de la base de datos */
  diameterForPoolForContinuosLeak() {
    let ymax = 0.00000127 * (this.hCombKJKG / this.hVapKJKGTB); //Vertical Burning Rate (m/s) CCPS pp225
    let diameterMax = 2.0 * Math.sqrt(this.spillRate / (Math.PI * ymax));
    return diameterMax;
  }
  /* ---------------- TIEMPO PARA ALCANZAR EL MAXIMO DIAMETRO EN EQUILIBRIO DE UNA FUGA CONTINUA ---------------- 
    - poolSizeForContinuosL - Diamtero determinado del metodo anterior (m)
    - brate - burning rate (kg/m2*s) del metodo anterior
    - density - (kg/m3) de la base de datos  */
  timeToReachPoolSizeForContinuosLeak() {
    let vf = this.bRate / this.densLiquidATB; //Regression rate (m/s)
    let teq = 0.564 * (this.diameterPoolContinuosLake / (Math.pow((G * vf * this.diameterPoolContinuosLake), 1.0 / 3.0)));
    return teq; //(s)
  }

  /* ---------------- TIEMPO DE DURACION DEL INCENDIO REF: http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.132.3106&rep=rep1&type=pdf ---------------- 
 - volLiquido - volumen del liquido (m3)
 - diameterPool - Diametro de la alberca de fuego (m)
 - bRate - Burning Rate (kg/m2*s)
 - densLiqu - Densidad del liquido (kg/m3)
   */
  timeDurationPoolFire(volLiquido) {
    let regresionRate = this.bRate / (this.densLiquidATB * 1000);
    return 4 * volLiquido / (Math.PI * Math.pow(this.diameterPoolContinuosLake, 2) * regresionRate);
  }

  /* ---------------- DIAMETRO MAXIMO DE LA ALBERCA CON FUGA INSTANTANEA---------------- 
 - vf = Fuel regression rate (m/s)
 - brate - burning rate (kg/m2*s) del metodo anterior
 - massrelease = Cantidad descargada de manera instantanea (m3)  */
  diameterForPoolSizeInstantaneousLeak() {
    let vf = this.bRate / this.densLiquidATB; //Regression rate (m/s)
    let Dmax = 2 * Math.pow((Math.pow(this.massRelease, 3) * G) / Math.pow(vf, 2), 1.0 / 8.0);
    return Dmax; //(m)
  }

  /* ---------------- TIEMPO PARA ALCANZAR EL MAXIMO DIAMETRO EN EQUILIBRIO DE UNA FUGA INSTANTANEA ---------------- 
   - poolSizeForContinuosL - Determinado del metodo anterior (m)
   - brate - burning rate (kg/m2*s) del metodo anterior
   - density - (kg/m3) de la base de datos
   - massrelease = Cantidad descargada de manera instantanea (m3)  */
  timeToReachPoolSizeForInstantaneousLeak() {
    let vf = this.bRate / this.densLiquidATB; //Regression rate (m/s)
    let teq = 0.6743 * Math.pow(this.massRelease / (G * Math.pow(vf, 2.0)), (1.0 / 4.0));
    return teq; //(s)
  }

  /* ---------------- DIAMETRO EQUIVALENTE PARA DIQUES NO CIRCULARES (m) ---------------- 
 Se calcula el diametro efectivo para diques rectangulares o cuadrados
 - AreaNoCircular- Area del diqe no circular (m) */
  diameterEffectiveForNonCircularPool() {
    let D = Math.sqrt((4 * this.areaDiqueNoCircular) / Math.PI);
    return D; //(m)
  }

  /*  ---------------- ux = VELOCIDAD DEL VIENTO ADIMENSIONAL ----------------
 - brate - burning rate (kg/m2*s) del metodo anterior
 - diameterPool - Diametro de la alberca de fuego (m)
 - winVel - Velocidad del viento (m/s)
 - tAmb - Temperatura Ambiente (C)
 - altitude - Altitud (m)
 FIXME: - Hace la diferenciacion en una nueva funcion  e ¡ntre continuos y massive lake... devolver ya el diametro que debe ser
*/
  uxVelVientoAdimensional() {
    // Presion atmosferica (Pa) A nivel del mar = 101325 Pa
    let pressureLevel = 101325.0 * Math.pow(1 - 2.5577E-5 * altitudMSNM, 5.25588); //(Pa)
    //Calculo de la Densidad del Aire para aire seco (kg/m3)
    let densAir = pressureLevel / (R_DRY_AIR * tAmbK);
    //Calculo de velocidad del viento adimensional   
    let ux = velocidadVientoMSEG * Math.pow((G * this.bRate * this.diameterForPoolForContinuosLeak()) / densAir, -1.0 / 3.0);
    if (ux < 1.0) {
      ux = 1.0;
    }
    return ux; //Adimensional
  }

}

var objeto = {
  fugaContinua: true,
  fugaMasiva: false,
  spillRate: 1, // En caso de FUGA CONTINUA (m3/s)
  massRelease: 1, //En caso de FUGA INSTANTANEA (m3)
  areaDiqueNoCircular: 30, //Area de un dique no circular (m2)
  lat: -99.212,
  lon: 19.4332
}

var newPF = new PoolFire(data[598 - 1], objeto); //1361 - Gasolina - 127 Ethane  -130 Ethanol 598 - n-Hexane

// TODO: Para buscar si es hidrocarburo: console.log(str.includes("To be")); // true

console.log(`El Burning Rate de ${newPF.sustancia.name} es: ${newPF.bRate} kg/m2*s`)
console.log(`Diametro de una fuga instantanea ${newPF.diameterForPoolSizeInstantaneousLeak()} m`)
console.log(`Velocidad Adimensional del viento:s ${newPF.uxVelVientoAdimensional()}`);