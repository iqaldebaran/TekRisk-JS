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
var humedadRelativa = 60; //(%)

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
    this.densLiquidATB = this.sustancia.dliqa * Math.pow(this.sustancia.dliqb, -1 * Math.pow((1 - this.sustancia.tb / this.sustancia.tc), this.sustancia.dliqn)) * 1000;
    // Entalpia de vaporizacion (kJ/kg) - a la temperatura de ebullicion CCPS 234 ej
    this.hVapKJKGTB = parseFloat(this.hVapKJKG) + parseFloat(this.cPKJKGK) * (this.tEbullK - tAmbK);
    // Formula para SEP verifica si es o no hidrocarburo
    this.name = this.sustancia.name;

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
    //Modelo a usar point source o solid plume
    this.isPointSourceModel = obj.isPointSourceModel;
    this.combustionFractionPointSource = obj.combustionFractionPointSource;
    this.isSolidPlumeModel = obj.isSolidPlumeModel;
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

  /* ---------------- DURACION DEL INCENDIO REF: http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.132.3106&rep=rep1&type=pdf ---------------- 
   - volLiquido - volumen del liquido (m3)
   - diameterPool - Diametro de la alberca de fuego (m)
   - bRate - Burning Rate (kg/m2*s)
   - densLiqu - Densidad del liquido (kg/m3)
     */
  timeDurationPoolFire(volLiquido) {
    let regresionRate = this.burningRate() / this.densLiquidATB;
    return 4 * volLiquido / (Math.PI * Math.pow(this.poolDiameter(), 2) * regresionRate);
  }


  /*  ---------------- ux = VELOCIDAD DEL VIENTO ADIMENSIONAL ----------------
   - brate - burning rate (kg/m2*s) del metodo anterior
   - diameterPool - Diametro de la alberca de fuego (m)
   - winVel - Velocidad del viento (m/s)
   - tAmb - Temperatura Ambiente (C)
   - altitude - Altitud (m)
  */
  ux() {
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
      if (velocidadVientoMSEG == 0) {
        //Ver MM/INFORMACION - Estimation_of_thermal_effects_on_receptor_from_poo.pdf
        return 42.0 * this.poolDiameter() * (Math.pow(this.burningRate() / (densAir * Math.sqrt(G * this.poolDiameter())), 0.61));
      }
      let flameHeightThomas = 55.0 * this.poolDiameter() * (Math.pow(this.burningRate() / (densAir * Math.sqrt(G * this.poolDiameter())), 0.67)) * Math.pow(this.ux(), -0.21);
      return flameHeightThomas; //(m)
    } else if (this.isAlturaFlamaPritchard) {
      let flameHeight = 10.615 * this.poolDiameter() * (Math.pow(this.burningRate() / (densAir * Math.sqrt(G * this.poolDiameter())), 0.305)) * Math.pow(this.ux(), -0.03);
      return flameHeight; //(m)
    }
  }

  /* ---------------- SEP PODER DE EMISION (kW/m2)---------------- 
 - diameter - diametro de la alberca de fuego (m)
 - burningRate - Velocidad de combustion (kg/m2*s)
 - Hcomb - Entalpia de combustion (kJ/kg)
 - formulaSust - Formula de la sustancia para determinar si es un hidrocarburo
 */
  SEP() {
    //Condicion para uso de la formula de hidrocarburos o no-hidrocarburos
    if ((this.name.includes("ANE") || this.name.includes("GAS") || this.name.includes("DIESEL") || this.name.includes("TURBO")) && (this.poolDiameter() > 15)) { //Es un hidrocarburo o gasolina o diesel etc y diametros de poolfire mayores a 15 m
      return 140 * Math.exp(-0.12 * this.poolDiameter()) + 20 * (1 - Math.exp(-0.12 * this.poolDiameter()));
    } else {
      return (0.35 * this.burningRate() * this.hCombKJKG) / (1 + 72.0 * Math.pow(this.burningRate(), 0.61)); //NO ES HIDROCARBURO o menor a 15 m
    }
    // //TODO: Ver sep para   -considerar soot
  }

  /* ---------------- ANGULO DE LA FLAMA (RADIANES)---------------- 
   - diameter - diametro de la alberca de fuego (m)
   - tAmb - Temperatura Ambiente (C)
   - windSpeed - Velocidad del viento (m/s)
   */
  anguloFlama() {
    if (velocidadVientoMSEG <= 0.0) {
      return 0.0;
    }
    //Calculo de la viscosidad cinematica del aire (m2/s) tAmb en C
    let v = 1.555E-14 * Math.pow((tAmbK), 3) + 9.5728E-11 * Math.pow(tAmbK, 2 + 3.7604E-8 * tAmbK + 3.4484E-6);
    //Froude 
    let Fr = Math.pow(velocidadVientoMSEG, 2.0) / (G * this.poolDiameter());
    //Reynolds 
    let Re = velocidadVientoMSEG * this.poolDiameter() / v;
    let c = 0.666 * Math.pow(Fr, 0.333) * Math.pow(Re, 0.117);
    //CALCULO DEL ANGULO DE LA FLAMA
    let tiltAngle = Math.sin((Math.sqrt((4 * Math.pow(c, 2) + 1.0)) - 1.0) / (2.0 * c));
    return tiltAngle;
  }

  /* ---------------- FACTOR DE VISTA "SOLID PLUME MODEL" CON VIENTO ----------------
 - x - Distancia a la que se requiere el cacluco o se adiciona distacia.
 - tiltAngle - Angulo de la flama determinado por la acion del viento Metodo flameTiltAngle() (RADIANES)
 - diameter - diametro de la alberca de fuego (m)
 - alturaFlama - Altura de la flama (m) del metodo heightFlame(Thomas o Pitchard)()
 FIXME: TRUENA CUENDO X ES MENOR AL RADIO DEL POOLFIRE*/
  viewFactor(x) {
    if (this.isSolidPlumeModel) {
      let poolRadio = this.poolDiameter() / 2.0;
      let alfa = this.alturaFlama() / poolRadio;
      console.log(alfa)
      let beta = x / poolRadio; //FIXME: VERIFICAR RADIO O COMO SE USAN PARAA QUE NO TRUENE
      let anglerad = this.anguloFlama(); //*M_PI/180.0; //Convertimos a radianes
      let seno = Math.sin(anglerad);
      let coseno = Math.cos(anglerad);

      let A = Math.sqrt(Math.pow(alfa, 2.0) + Math.pow(beta + 1.0, 2.0) - 2.0 * alfa * (beta + 1.0) * seno);
      let B = Math.sqrt(Math.pow(alfa, 2.0) + Math.pow(beta - 1.0, 2.0) - 2.0 * alfa * (beta - 1.0) * seno);
      let C = Math.sqrt(1 + (Math.pow(beta, 2.0) - 1.0) * Math.pow(coseno, 2.0));
      let D = Math.sqrt((beta - 1.0) / (beta + 1.0));
      let E = alfa * coseno / (beta - alfa * seno);
      let F = Math.sqrt(Math.pow(beta, 2.0) - 1.0);

      let F2 = Math.pow(F, 2.0);
      let alfa2 = Math.pow(alfa, 2.0);

      //Factor de Vista vertical 
      let Fv1 = -E * Math.atan(D);
      let Fv2 = E * ((alfa2 + Math.pow(beta + 1.0, 2.0) - 2.0 * beta * (1.0 + alfa * seno)) / (A * B)) * Math.atan((A * D) / B);
      let Fv31 = Math.atan((alfa * beta - F2 * seno) / (F * C));
      let Fv32 = Math.atan(((F2 * seno) / (F * C)));
      let Fv3 = (coseno / C) * (Fv31 + Fv32);
      let Fv = (Fv1 + Fv2 + Fv3) / Math.PI;

      //Factor de Vista horizontal
      let Fh1 = Math.atan(1 / D);
      let Fh21 = Math.atan((alfa * beta - F2 * seno) / (F * C));
      let Fh22 = Math.atan(F * seno / C);
      let Fh2 = (seno / C) * (Fh21 + Fh22);
      let Fh3 = ((alfa2 + (Math.pow((beta + 1.0), 2.0) - 2.0 * (beta + 1 + alfa * beta * seno))) / (A * B)) * Math.atan(A * D / B);
      let Fh = (Fh1 + Fh2 - Fh3) / Math.PI;

      let Fvista = Math.sqrt(Math.pow(Fv, 2.0) + Math.pow(Fh, 2.0));

      return Fvista;
    }
    // En caso de Point Source Model
    return 1 / (4 * Math.PI * Math.pow(x, 2))
  }

  /* ---------------- TRANSMITIVIDAD ATMOSFÉRICA (ADIMENSIONAL) ----------------
 - HumedadRelativa - Humedad relativa en (%) se debe convertir entre 0 y 1
 - x - Distancia a la que se requiere el calculo o se adiciona distacia.
 - poolDiameter - diametro de la alberca de fuego (m)
 - tAmb - Temperatura Ambiente (C)
*/
  ta(x) {
    if (humedadRelativa == 0) {
      humedadRelativa = 0.001;
    }
    let pHR = humedadRelativa / 100.00; //La humedad relativa se convierte a parcial numerado entre 0 y 1
    let radio = this.poolDiameter() / 2.0;
    let c4 = 2.02;
    //Calculo de la Presion Parcial de Vapor de Agua (PA)
    let pwo = Math.exp(77.3450 + 0.0057 * (tAmbK) - 7235.0 / (tAmbK)) / Math.pow((tAmbK), 8.2); //(PA)
    let pw = pHR * pwo; //(PA)

    //Calculo de la Transmitividad atmosferica a la distancia x
    return c4 * Math.pow(pw * (x), -0.09);
  }


  /* ---------------- RADIACION TERMICA (kW/m2) A UNA DISTANCIA DADA (m) ----------------
 - humedadRelativa - Humedad relativa en (%) se debe convertir entre 0 y 1
 - xTerm - Distancia a la que se requiere el calculo de la radiación térmica (m).
 - diameter - diametro de la alberca de fuego (m)
 - tAmb - Temperatura Ambiente (C)
 - sEP - Poder de emisión, se toma del método "Sep"
 - alturaDeFlama - Altura maxima alcanzada por la flama (m) depende del metodo a usar Thomas o Pitchard
 - tiltAngle - Angulo de inclinación de la flama por acción del viento (Radianes)
 */
  qTermAtX(x) {
    // Calculo para POINT SOURCE MODEL
    if (this.isPointSourceModel) {
      let poolArea = (Math.PI * Math.pow(this.poolDiameter(), 2)) / 4; //Area del pool fire
      return this.ta(x) * this.combustionFractionPointSource * this.burningRate() * this.hCombKJKG * this.viewFactor(x) * poolArea
    }
    //Calculo para SOLID PLUME MODEL
    return this.SEP() * this.viewFactor(x) * this.ta(x);
  }

  /*TODO: ---------------- PROBIT - Eisenberg CCPS 269 ----------------
 - Intensidad = qTermAtX (kW/m2)
 - t - Tiempo de exposision (s)
 */
  probit(tiempoExposicionS, x) {
    return -14.9 + 2.56 * Math.log(tiempoExposicionS * Math.pow(this.qTermAtX(x) * 1000, 4 / 3) / 10000);
    // probitObj.quemaduras2oGrdo = 
  }

  //Function erf
  erf(x) {
    // erf(x) = 2/sqrt(pi) * integrate(from=0, to=x, e^-(t^2) ) dt
    // with using Taylor expansion, 
    //        = 2/sqrt(pi) * sigma(n=0 to +inf, ((-1)^n * x^(2n+1))/(n! * (2n+1)))
    // calculationg n=0 to 50 bellow (note that inside sigma equals x when n = 0, and 50 may be enough)
    var m = 1.00;
    var s = 1.00;
    var sum = x * 1.0;
    for (var i = 1; i < 50; i++) {
      m *= i;
      s *= -1;
      sum += (s * Math.pow(x, 2.0 * i + 1.0)) / (m * (2.0 * i + 1.0));
    }
    return 2 * sum / Math.sqrt(3.14159265358979);
  }

  probitPrcFatalidades(te, x) {
    let probit = this.probit(te, x);
    if(probit < 0) {
      return 0;
    }
    return 50 * (1 + ((probit - 5) / Math.abs(probit - 5)) * this.erf(Math.abs(probit - 5) / Math.sqrt(2)));

    //COn la libreria mathjs
    //  return 50*(1+((probit-5)/Math.abs(probit-5))*math.erf(Math.abs(probit-5)/Math.sqrt(2)));

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
  //Modelo de point source o solid plume model
  isPointSourceModel: true,
  combustionFractionPointSource: 0.35, //CCPS 230-232 Tabla 2.27 (de 0.15 a 0.40)
  isSolidPlumeModel: false,
  //Volumenes de fuga
  spillRate: 0.000833333333, // En caso de FUGA CONTINUA (m3/s)
  massRelease: .01, //En caso de FUGA INSTANTANEA (m3)
  //Medidas de un dique no circular (m2)
  anchoDiqueNoCircular: 3, // (m)
  largoDiqueNoCircular: 5, // (m)
  //Diamtero de un dique circular (m)
  diametroDiqueCircular: 25, // (m)
  //Localizacion geografica del punto de fuga
  lat: -99.212,
  lon: 19.4332
}

var newPF = new PoolFire(data[130 - 1], objeto); //1361 - Gasolina - 127 Ethane  -130 Ethanol 598 - n-Hexane : 1364-DISEL : 1366-BIODIESEL : 1365-TURBOSINA TODO: Verificar parametros de turbosina


console.log(`El Burning Rate de ${newPF.sustancia.name} es: ${newPF.burningRate()} kg/m2*s`)
console.log(`Calor de combustion ${newPF.sustancia.hckjkg}`)
console.log(`Diametro Pool Fire ${newPF.poolDiameter()} m`)
console.log(`Velocidad Adimensional del viento: ${newPF.ux()}`);
console.log(`Tiempo para alcanzar diametro en equilibrio ${newPF.timeToReachPoolSize()} s`)
console.log(`Duración del fuego: ${newPF.timeDurationPoolFire(1)} s`)
console.log(`Altura de la flama: ${parseFloat(newPF.alturaFlama().toFixed(3))} m`)
console.log(`Angulo de la flama: ${parseFloat((newPF.anguloFlama()*180/Math.PI+90).toFixed(10))} Grados`)
console.log(`SEP: ${newPF.SEP()} kW/m2`)
console.log(`ta: ${newPF.ta(20.64)} kW/m2`)
console.log(`View factor: ${newPF.viewFactor(20.64)}`)

var tiempoExpos = 40 //seg
for (x = 1; x < 30; x = x + .1) {
  console.log(`Radiación térmica: ${parseFloat(x).toFixed(1)} m - ${parseFloat(newPF.qTermAtX(x)).toFixed(2)} kW/m2 - Probit: ${parseFloat(newPF.probit(tiempoExpos,x).toFixed(3))} - Porcentaje = ${newPF.probitPrcFatalidades(tiempoExpos,x)}`)
}