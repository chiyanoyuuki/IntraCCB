import { Injectable } from '@angular/core';
import { Presta } from '../models/models.model';

@Injectable({
  providedIn: 'root'
})
export class PrestaService {

  constructor() { }

  getPlanningPrestasTime(prestas : Presta[])
  {
    let time = 0;
    prestas.forEach(p=>{if(p.time && p.presta==0)time += p.time});
    return parseFloat(""+time);
  }

  getPrestasTime(prestas : Presta[])
  {
    let time = 0;
    prestas.forEach(p=>{if(p.time && p.qte && p.qte!='?')time += p.time * parseFloat(""+p.qte)});
    return parseFloat(""+time);
  }

  getPrestasPrice(prestas : Presta[], noHelpers: boolean = true, onlyHelpers: boolean = false)
  {
    let price = 0;
    prestas.forEach((presta:any)=>{
      if(onlyHelpers)
      {
        if(presta.nom.includes("renfort"))
         price += parseFloat(this.calc(presta));
      }
      else if(noHelpers)
      {
        if(!presta.nom.includes("renfort"))
         price += parseFloat(this.calc(presta));
      }
      else
      {
        price += parseFloat(this.calc(presta));
      }
    })
    return parseFloat(""+price);
  }

  getPlanningPrestasPrice(prestas : Presta[], notMe: boolean = false)
  {
    let price = 0;
    prestas.forEach((presta:any)=>{
      if(notMe)
      {
        if(presta.presta!=0)
          price = price + parseInt(this.calc(presta, true));
      }
      else
      {
        if(presta.presta==0)
          price = price + parseInt(this.calc(presta, true));
      }
    })
    return price;
  }

  public calc(presta: any, onlyOne:boolean = false):any {
    if(presta.qte=="?")return 0;
    presta.prix = parseFloat(presta.prix);
    presta.qte = parseFloat(presta.qte);
    let prix = presta.prix * presta.qte;
    if(onlyOne) prix = presta.prix;
    if (presta.kilorly) {
      if (presta.qte <= 10) prix = 0;
      else {
        prix = (presta.qte - 10) * 2 * presta.prix;
      }
    }
    if (presta.reduc) prix = prix - (prix * presta.reduc) / 100;
    if (Number.isInteger(presta.prix) || presta.kilorly)
      prix = Math.floor(prix);
    return prix;
  } 
}
