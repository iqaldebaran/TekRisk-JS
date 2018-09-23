/* PoolFire.js */

//---------- CONSTANTES --------------------------------------------
const G = 9.80665; //Aceleración de la gravedad (m/s2)
const R_DRY_AIR = 287.05; //Constante específica del aire (J/kg*K)
//------------------------------------------------------------------

//---DATOS DE CLIMA ----
// - tAmb - Temperatura ambiente (C) - API
var tAmbC = 0;
var tAmbK = tAmbC + 273.15;
var velocidadVientoMSEG = 1.5; //Velocidad del viento (m/s)
var altitudMSNM = 2500; //Altitud (msnm)

/* TODO: A MEJORAR:
   - Para fugas continuas revisar Kakosimos pp51
      - Fuga contunia desde tanques (Horizontales, verticales, esferas... como Aloha)
      - Fuga continua desde tubería
*/

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
    //¿Fuga continua o masiva, dique circular no circular?
    this.isfugaContinua = obj.isfugaContinua;
    this.isfugaMasiva = obj.isfugaMasiva;
    this.isDiqueCircular = obj.isDiqueCircular;
    this.isDiqueNoCircular = obj.isDiqueNoCircular;
    //En caso de dique no circular
    this.anchoDiqueNoCircular = obj.anchoDiqueNoCircular;
    this.largoDiqueNoCircular = obj.largoDiqueNoCircular;
    //Escoge metodo para altura de la flama
    this.isAlturaFlamaThomas = obj.isAlturaFlamaThomas;
    this.isAlturaFlamaPritchard = obj.isAlturaFlamaPritchard;
    //-------Tipo de Burning Rate Mudan o Strasser
    this.isBRateMudan = obj.isburningRateMudan;
    this.isBRateStrasser = obj.isburningRateStrasser;
    //Fuga continua (m3/s)
    this.spillRate = obj.spillRate;
    //Fuga Intantanea (m3)
    this.massRelease = obj.massRelease;
    //Area de un dique no circular
    this.areaDiqueNoCircular = obj.areaDiqueNoCircular;
    //Diamtero dique cicular
    this.diametroDiqueCircular = obj.diametroDiqueCircular;
    //--------------------------------------

  }

  /* --------------  BURNING RATE (kg/m2*s) con el Método BURGUESS-STRASSER-KAKOSIMOS pp 82 y MUDAN KAKOSIMOS pp 83 -----------------
    - hVapKJKG - Entalpia de vaporizacion (KJ/kg) - DB
    - hCombKJKG - Entalpia de combustion (KJ/kg) - DB
    - tEbullK - Temperatura de ebullicion (K) - DB
    - cPKJKGK - Capacidad calorica (KJ/kg*K) - DB
    - densLiquidTB - Densidad del liquido a temperatura de ebullición (kg/m3) - DB
    */
  burningRate() {
    if (this.isBRateStrasser) {
      let c1 = 0.00000127; // m/s KAKOSIMOS pp82
      let brate = this.densLiquidATB * c1 * (this.hCombKJKG / (this.hVapKJKGTB + this.cPKJKGK * (this.tEbullK - (tAmbK))));
      return brate; //(kg/m2*s)
    }
    //Metodo Mudan
    let c1 = 0.001; // kg/m2*s KAKOSIMOS pp83
    let brate = (c1 * this.hCombKJKG) / (this.hVapKJKGTB + this.cPKJKGK * (this.tEbullK - (tAmbK)));
    return brate; //(kg/m2*s)
  }


  /* ---------------- DIAMETRO MAXIMO DE LA ALBERCA CON FUGA CONTINUA - CCPS pp 228 y y` 234 - FUGA INSTANTANEA - DIQUE CIRCULAR - DIQUE NO CIRCULAR----------------------
  Se determina hasta alcanzar el equilibrio entre lo consumido y lo fugado
  - spillRate - Fuga del liquido (m3/s)
  - brate - Burning Rate (kg/m2*s)  
  - diameterMax - (m) 
  - liqDens - (kg/m3) de la base de datos 
  - vf = Fuel regression rate (m/s)
   - massrelease = Cantidad descargada de manera instantanea (m3)
  */
  /* ---------------- DIAMETRO EQUIVALENTE PARA DIQUES NO CIRCULARES (m) ---------------- 
   Se calcula el diametro efectivo para diques rectangulares o cuadrados
*/
  poolDiameter() {
    if (this.isfugaContinua) {
      let ymax = 0.00000127 * (this.hCombKJKG / this.hVapKJKGTB); //Vertical Burning Rate (m/s) CCPS pp225
      let diameterMax = 2.0 * Math.sqrt(this.spillRate / (Math.PI * ymax));
      return diameterMax;
    } else if (this.isfugaMasiva) {
      let vf = this.burningRate() / this.densLiquidATB; //Regression rate (m/s)
      let Dmax = 2 * Math.pow((Math.pow(this.massRelease, 3) * G) / Math.pow(vf, 2), 1.0 / 8.0);
      return Dmax; //(m)
    } else if (this.isDiqueCircular) {
      return this.diametroDiqueCircular;
    } else if (this.isDiqueNoCircular) {
      let area = this.largoDiqueNoCircular * this.anchoDiqueNoCircular; //Area en 
      let D = Math.sqrt((4 * area) / Math.PI);
      return D; //(m)
    }
  }

  /* ---------------- TIEMPO PARA ALCANZAR EL MAXIMO DIAMETRO EN EQUILIBRIO ---------------- 
    - poolSizeForContinuosL - Diamtero determinado del metodo anterior (m)
    - brate - burning rate (kg/m2*s) del metodo anterior
    - density - (kg/m3) de la base de datos  
    - massrelease = Cantidad descargada de manera instantanea (m3)  
  */
  timeToReachPoolSize() {
    if (this.isfugaContinua) {
      let vf = this.burningRate() / this.densLiquidATB; //Regression rate (m/s)
      let teq = 0.564 * (this.poolDiameter() / (Math.pow((G * vf * this.poolDiameter()), 1.0 / 3.0)));
      return teq; //(s)
    } else if (this.isfugaMasiva) {
      let vf = this.burningRate() / this.densLiquidATB; //Regression rate (m/s)
      let teq = 0.6743 * Math.pow(this.massRelease / (G * Math.pow(vf, 2.0)), (1.0 / 4.0));
      return teq; //(s)
    }
    return 0;
  }

  /* ---------------- TIEMPO DE DURACION DEL INCENDIO REF: http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.132.3106&rep=rep1&type=pdf ---------------- 
   - volLiquido - volumen del liquido (m3)
   - diameterPool - Diametro de la alberca de fuego (m)
   - bRate - Burning Rate (kg/m2*s)
   - densLiqu - Densidad del liquido (kg/m3)
     */
  timeDurationPoolFire(volLiquido) {
    let regresionRate = this.burningRate() / (this.densLiquidATB * 1000);
    return 4 * volLiquido / (Math.PI * Math.pow(this.poolDiameter(), 2) * regresionRate);
  }


  /*  ---------------- ux = VELOCIDAD DEL VIENTO ADIMENSIONAL ----------------
   - brate - burning rate (kg/m2*s) del metodo anterior
   - diameterPool - Diametro de la alberca de fuego (m)
   - winVel - Velocidad del viento (m/s)
   - tAmb - Temperatura Ambiente (C)
   - altitude - Altitud (m)
  */
  uxVelVientoAdimensional() {
    // Presion atmosferica (Pa) A nivel del mar = 101325 Pa
    let pressureLevel = 101325.0 * Math.pow(1 - 2.5577E-5 * altitudMSNM, 5.25588); //(Pa)
    //Calculo de la Densidad del Aire para aire seco (kg/m3)
    let densAir = pressureLevel / (R_DRY_AIR * tAmbK);
    //Calculo de velocidad del viento adimensional   
    let ux = velocidadVientoMSEG * Math.pow((G * this.burningRate() * this.poolDiameter()) / densAir, -1.0 / 3.0);
    if (ux < 1.0) {
      ux = 1.0;
    }
    return ux; //Adimensional
  }


  /*---------------- DIAMETRO ELONGADO POR ACCION DEL VIENTO----------------
 - diameterPool - Diametro de la alberca de fuego (m)
 - ux - Velocidad del viento adimensional
 */
  // -(float) elongatedFlameBaseDiameter : (float) ux : (float) diameterPool
  // {
  //     //Froude
  //     float Fr = pow(ux, 2)/(g*diameterPool);

  //     //Para flama cilìndrica (Ver YB - 6.67 para Conical Flame)
  //     float diameterPoolElongated = diameterPool*(1.5*pow(Fr, 0.069));

  //     return diameterPoolElongated;
  // }

  /* ---------------- ALTURA DE LA FLAMA (Flame height) (m)---------------- 
   Existen al menos 3 Metodos: Thomas, Pritchard y Heskestad
   - brate - burning rate (kg/m2*s) del metodo anterior
   - diameterPool - Diametro de la alberca de fuego (m)
   - winVel - Velocidad del viento (m/s)
   - pressureLevel - Presion atmosferica (Pa) A nivel del mar = 101325 Pa
   - tAmb - Temperatura Ambiente (C)
   - altitude - Altitud (m)
  */

  alturaFlama() {
    let pressureLevel = 101325.0 * Math.pow(1 - 2.5577E-5 * altitudMSNM, 5.25588); //(Pa)
    var densAir = pressureLevel / (R_DRY_AIR * (tAmbK)); //(kg/m3)
    if (this.isAlturaFlamaThomas) {
      let flameHeightThomas = 55.0 * this.poolDiameter() * (Math.pow(this.burningRate() / (densAir * Math.sqrt(G * this.poolDiameter())), 0.67)) * Math.pow(this.uxVelVientoAdimensional(), -0.21);
      return flameHeightThomas; //(m)
    } else if(this.isAlturaFlamaPritchard){
      let flameHeight = 10.615 * this.poolDiameter() * (Math.pow(this.burningRate() / (densAir * Math.sqrt(G * this.poolDiameter())), 0.305)) * Math.pow(this.uxVelVientoAdimensional(), -0.03);
      return flameHeight; //(m)
    }
  }

}

var objeto = {
  //Datos para calculo del diametro del PoolFire
  //Solo uno es verdadero, los demas falsos
  isfugaContinua: true,
  isfugaMasiva: false,
  isDiqueCircular: false,
  isDiqueNoCircular: false,
  //Datos para tipo de ecuacion del Burning Rate
  isburningRateStrasser: false,
  isburningRateMudan: true,
  //Datos Altura de la flama - 2 metodos
  isAlturaFlamaThomas: false,
  isAlturaFlamaPritchard: true,
  //Volumenes de fuga
  spillRate: .001, // En caso de FUGA CONTINUA (m3/s)
  massRelease: 1, //En caso de FUGA INSTANTANEA (m3)
  //Medidas de un dique no circular (m2)
  anchoDiqueNoCircular: 3, // (m)
  largoDiqueNoCircular: 3, // (m)
  //Diamtero de un dique circular (m)
  diametroDiqueCircular: 5, // (m)
  //Localizacion geografica del punto de fuga
  lat: -99.212,
  lon: 19.4332
}

var newPF = new PoolFire(data[1361 - 1], objeto); //1361 - Gasolina - 127 Ethane  -130 Ethanol 598 - n-Hexane

// TODO: Para buscar si es hidrocarburo: console.log(str.includes("To be")); // true

console.log(`El Burning Rate de ${newPF.sustancia.name} es: ${newPF.burningRate()} kg/m2*s`)
console.log(`Diametro de una fuga ${newPF.poolDiameter()} m`)
console.log(`Velocidad Adimensional del viento: ${newPF.uxVelVientoAdimensional()}`);
console.log(`Tiempo para alcanzar diametro en equilibrio ${newPF.timeToReachPoolSize()} s`)
console.log(`Altura de la flama: ${parseFloat(newPF.alturaFlama().toFixed(3))} m`)