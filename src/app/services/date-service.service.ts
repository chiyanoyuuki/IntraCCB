import { inject, Injectable } from '@angular/core';
import { Facture, Journee, Presta } from '../models/models.model';
import { PrestaService } from './presta-service.service';
import { CalcService } from './calc-service.service';
import { FormatService } from './format-service.service';

@Injectable({
  providedIn: 'root'
})
export class DateService {
  private formatService = inject(FormatService);
  constructor() { }

  public getStatut(journees: Journee[], dateStr: string): string | null {
    const journeesTrouvees = this.getDaysThisDay(journees, dateStr);
    let statut = null;

    if(journeesTrouvees.find((j=>j.statut=="reserve"))) statut = "reserve";
    else if(journeesTrouvees.find((j=>j.statut=="demande"))) statut = "demande";
    else if(journeesTrouvees.find((j=>j.statut=="essai"))) statut = "essai";
    else if(journeesTrouvees.find((j=>j.statut=="autre"))) statut = "autre";
    else if(journeesTrouvees.find((j=>j.statut=="perso"))) statut = "perso";

    if(journeesTrouvees.length>0&&journeesTrouvees.filter((j=>j.etape==999)).length==journeesTrouvees.length)
      statut = "over";

    return statut;
  }

  public getNoPlanning(journees: Journee[], dateStr: string): boolean {
    let statut = false;
    let data = this.fromNow(journees).filter(day=>day.statut=='reserve');
    const journeesTrouvees = this.getDaysThisDay(data, dateStr);
    if(journeesTrouvees.find(day=>!day.planning.planningprestas)) statut = true;
    return statut;
  }

  /*CALCULS*/

  public getNbStatut(journees:Journee[], statut:string, year:number, mois:number)
  {
    console.log(journees, statut, year, mois);
    let data = this.thisYear(journees,year);
    if(mois) data = this.thisMonth(journees, mois, year);
    const still = data.filter((day=>day.statut==statut && day.etape!=999)).length;
    const over = data.filter((day=>day.statut==statut && day.etape==999)).length
    return "Encore <span class='glow'>" + still +"</span> " + (statut=='reserve'?'mariages':statut) + (statut!='reserve'&&still>1?'s':'') + " " +  (statut!='demande'?"(" + over + " déjà finis)":"");
  }

  public getNbEtape(journees:Journee[], etape:number, year:number, mois:number)
  {
    let data = this.thisYear(journees,year);
    if(mois) data = this.thisMonth(journees, mois, year);
    const number = data.filter((day=>day.etape==etape && day.statut!="perso")).length
    return "Prestations terminées : <span class='glow'>" + number + "</span>";
  }

  public getMonthFactures(journees:Journee[], month:number, year:number)
  {
    const factures = journees.flatMap(journee => {
      return journee.factures
        .filter(facture => {
          const [day, monthStr, yearStr] = facture.creation.split("/");
          const factureYear = parseInt(yearStr, 10);
          const factureMonth = parseInt(monthStr, 10);
          return factureYear === year && (month?factureMonth === month + 1:true);
        })
        .map(facture => ({
          ...facture,
          nom: journee.nom, // Ajout du nom de la journée à la facture
          date: journee.date,
          id: journee.id
        }));
    });
    return this.formatService.sortByCreation(factures);
  }

  

  /*TEMPS*/

  public isPast(dateStr:string)
  {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const parts = dateStr.split('/');
    if (parts.length !== 3) return false; // date invalide

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // JS months 0-based
    const year = parseInt(parts[2], 10);

    const date = new Date(year, month, day);
    date.setHours(0, 0, 0, 0);

    return date < today;
  }

  public thisYear(journees:Journee[], currentYear:number)
  {
    return journees.filter(j => {
      const [day, month, year] = j.date.split('/').map(Number);
      return year === currentYear;
    });
  }

  public thisMonth(journees:Journee[], currentMonth:number, currentYear:number)
  {
    return journees.filter(j => {
      const [day, month, year] = j.date.split('/').map(Number);
      return year === currentYear && month === currentMonth + 1;
    });
  }

  public getDaysThisDay(journees:Journee[], dateStr: string, id: string="")
  {
    let filtered = journees.filter(day => day.date === dateStr);

    if (id !== "") {
      filtered.sort((a, b) => {
        if (""+a.id === id) return -1;
        if (""+b.id === id) return 1;
        return 0;
      });
    }

    return filtered;
  }

  public fromNow(journees:Journee[])
  {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return journees.filter(j => {
      const [day, month, year] = j.date.split('/').map(Number);
      const jDate = new Date(year, month - 1, day);
      jDate.setHours(0, 0, 0, 0);

      return jDate >= today;
    });
  }

  public untilNow(journees:Journee[])
  {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return journees.filter(j => {
      const [day, month, year] = j.date.split('/').map(Number);
      const jDate = new Date(year, month - 1, day);
      jDate.setHours(0, 0, 0, 0);

      return jDate < today;
    });
  }
}
