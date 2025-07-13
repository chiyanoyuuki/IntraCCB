import { inject, Injectable } from '@angular/core';
import { Facture, Journee } from '../models/models.model';
import { PrestaService } from './presta-service.service';
import { DateService } from './date-service.service';
import { FormatService } from './format-service.service';

@Injectable({
  providedIn: 'root'
})
export class CalcService {
  private dateService = inject(DateService);
  private prestaService = inject(PrestaService);
  private formatService = inject(FormatService);

  constructor() { }

  public getHoursWorked(journees:Journee[], year:number, fromNow:boolean, untilNow:boolean, month:number)
  {
    let data = this.dateService.thisYear(journees,year);
    if(month) data = this.dateService.thisMonth(journees, month, year);
    if(fromNow)data = this.dateService.fromNow(data);
    else if(untilNow) data = this.dateService.untilNow(data);

    let time = 0;

    data.forEach((day=>{
      if(day.statut=='essai')time+=120;
      else if(day.statut=='autre')time+=240;
      else if(day.statut=='reserve')
      {
        let prestas = day.planning.planningprestas;
        if(prestas)
        {
          time += this.prestaService.getPlanningPrestasTime(prestas);
        }
        else
        {
          prestas = day.devis.prestas;
          if(prestas)
          {
            time += this.prestaService.getPrestasTime(prestas);
          }
        }
      }
    }))

    return time;
  }

  public getPerHour(journees:Journee[], year:number, fromNow:boolean, untilNow:boolean, month:number)
  {
    const hours = parseInt(""+(this.getHoursWorked(journees,year,fromNow,untilNow, month) / 60));
    let total = 0;
    if(fromNow) total = this.getNotPaid(journees,year,month);
    else if(untilNow) total = this.getAlreadyPaid(journees,year,month);
    else total = this.getAlreadyPaid(journees,year,month); + this.getNotPaid(journees,year,month);
    return parseInt(""+(total / hours));
  }

  public getAlreadyPaid(journees: Journee[], year: number, month:number)
  {
    let factures = journees.flatMap(entry => entry.factures)
      .filter(facture => {
        const factureYear = parseInt(facture.creation.split("/")[2], 10);
        const factureMonth = parseInt(facture.creation.split("/")[1], 10);
        return factureYear == year && (month?factureMonth == month+1:true);
      });

    let total = 0;
    factures.forEach((f:Facture)=>{
      if(f.solde){total += parseFloat(""+f.solde);}
    })

    return parseInt(""+total);
  }

  public getAlreadyPaidThisDay(journee: Journee, onlyFactures:boolean = false)
  {
    let factures = journee.factures;

    let total = 0;
    factures.forEach((f:Facture)=>{
      // On ajoute le solde s'il y en a un
      if(f.solde){total += parseFloat(""+f.solde);}
      // Sinon on calcul le solde
      else
      {
        total += this.prestaService.getPrestasPrice(f.prestas, false);
      }
    })

    if(!onlyFactures)
    {
      // Si la date a un paiement prestataire on l'enlève
      let tot = 0;
      if(journee.prestataires) tot += parseFloat(""+journee.prestataires);
      else{journee.factures.filter((facture:any)=>facture.paiementprestas).forEach((facture:any)=>tot+= parseFloat(facture.paiementprestas));}
      total-= parseFloat(""+tot);
    }

    return parseInt(""+total);
  }

  public getNotPaid(journees: Journee[], year: number, month:number, withDemands: boolean = false)
  {
    let dates = journees.filter((date:any)=>{
      const dateYear = parseInt(date.date.split("/")[2], 10);
      const dateMonth = parseInt(date.date.split("/")[1], 10);
      return dateYear==year&&(month?dateMonth == month+1:true)&&date.etape!=999&&date.devis&&date.devis.creation
    });

    if(!withDemands) dates = dates.filter(day=>day.statut!="demande");

    let total = 0;
    dates.forEach((date:any)=>{
      total += this.getMineThisDay(date);
      date.factures.forEach((facture:any)=>{
        total-=parseFloat(facture.solde);
      })
    });

    return parseInt(""+total);
  }

  public getHelpers(journees: Journee[], year:number, month:number)
  {
    let total:any = 0;

    let dates = journees.filter((date:any)=>{
      const dateYear = parseInt(date.date.split("/")[2], 10);
      const dateMonth = parseInt(date.date.split("/")[1], 10);
      return dateYear==year&& (month?dateMonth == month+1:true)&&date.statut!="demande";
    });

    dates.forEach((d:any)=>{
      let tot = 0;
      if(d.prestataires) tot+= parseFloat(d.prestataires);
      else{d.factures.filter((facture:any)=>facture.paiementprestas).forEach((facture:any)=>tot+= parseFloat(facture.paiementprestas));}
      if(tot==0)
      {
        if(d.planning&&d.planning.planningprestas)
        {
          tot += this.prestaService.getPlanningPrestasPrice(d.planning.planningprestas, true);
        }
      }
      if(d.devis&&d.devis.prestas)
      {
        tot += this.prestaService.getPrestasPrice(d.devis.prestas, false, true);
      }
      total += parseFloat(""+tot);
    })
    return parseInt(total);
  }

  public getHelpersThisDay(journee: Journee)
  {
    let total:any = 0;

    let tot = 0;
    if(journee.prestataires) tot+= parseFloat(""+journee.prestataires);
    else{journee.factures.filter((facture:any)=>facture.paiementprestas).forEach((facture:any)=>tot+= parseFloat(facture.paiementprestas));}
    if(tot==0)
    {
      if(journee.planning&&journee.planning.planningprestas)
      {
        tot += this.prestaService.getPlanningPrestasPrice(journee.planning.planningprestas, true);
      }
      if(journee.devis&&journee.devis.prestas)
      {
        tot += this.prestaService.getPrestasPrice(journee.devis.prestas, false, true);
      }
    }
    total += parseFloat(""+tot);
    return parseInt(total);
  }

  public getMineThisDay(journee: Journee)
  {
    let total:any = 0;

    let tot = 0;
    if(journee.planning&&journee.planning.planningprestas)
    {
      tot += this.prestaService.getPlanningPrestasPrice(journee.planning.planningprestas,false);
      total += parseFloat(""+tot);
      if(journee.devis&&journee.devis.prestas)
      {
        journee.devis.prestas.forEach(presta=>{if(presta.kilorly&&!presta.nom.includes("renfort"))total+=this.prestaService.calc(presta);})
      }
    }
    else if(journee.devis&&journee.devis.prestas)
    {
      tot += this.prestaService.getPrestasPrice(journee.devis.prestas);
      total += parseFloat(""+tot);
    }
    return parseInt(total);
  }

  public getMonthFacturesMissing(journees:Journee[], month:number, year:number)
  {
    let factures: any = [];
    let data = this.dateService.thisYear(journees, year);
    if(month) data = this.dateService.thisMonth(journees, month, year);
    data.forEach(journee=>
    {
      if(journee.devis && journee.devis.prestas)
      {
        let reste = this.getMineThisDay(journee) - this.getAlreadyPaidThisDay(journee,true);
        if(reste>0)
        {
          factures.push({creation:journee.date,nom:journee.nom,solde:reste,id:journee.id});
        }
      }
    });
    return this.formatService.sortByCreation(factures);
  }

  public getEstimate(journees: Journee[], year:number, month:number){return this.getAlreadyPaid(journees,year,month) + this.getNotPaid(journees,year,month,true);}
  public getTotal(journees: Journee[], year:number, month:number){return this.getAlreadyPaid(journees,year,month) + this.getNotPaid(journees,year,month);}
}
