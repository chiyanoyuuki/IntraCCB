import { Injectable, inject, isDevMode } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { Journee, Statut } from '../models/models.model';
import { DateService } from './date-service.service';

@Injectable({ providedIn: 'root' })
export class DataService {
  private http = inject(HttpClient);
  private dateService = inject(DateService);

  private apiUrl = 'http' + (isDevMode() ? '' : 's') + '://chiyanh.cluster031.hosting.ovh.net/sksPlanning.php';

  private dataSubject = new BehaviorSubject<any | null>(null);
  private basePrestas: any = [
    {
      nom: 'Frais de déplacement',
      en: 'Travel Expenses',
      titre: true,
    },
    {
      nom: 'Frais de déplacement Jour-J (Aller/Retour)',
      en: 'D-Day Travel Expenses (Round Trip)',
      prix: 0.4,
      kilorly: true,
      id:"kmjj"
    },
    {
      nom: 'Frais de déplacement Essai (Aller/Retour)',
      en: 'Trial Travel Expenses (Round Trip)',
      prix: 0.4,
      kilorly: true,
      id:"kmessai"
    },
    {
      nom: 'Frais de déplacement renfort (Aller/Retour)',
      en: 'Backup Travel Expenses (Round Trip)',
      prix: 0.4,
      kilorly: true,
      id:"kmrenfort"
    },
    {
      nom: 'Mariée (essai et jour-J)',
      en: 'Bride (Trial and D-Day)',
      titre: true,
    },
    {
      nom: 'Forfait Tulipe',
      en: 'Tulip Package',
      desc: "Tulipe - Maquillage ET Coiffure",
      prix: 450,
      bride: true,
      time: 120,
      maquillage: true,
      coiffure: true,
      id:"tulip"
    },
    {
      nom: 'Forfait Camélia - Maquillage',
      en: 'Camellia Package - Makeup',
      desc: "Camélia - Maquillage",
      prix: 240,
      bride: true,
      time: 60,
      maquillage: true,
      coiffure: false,
      id:"cameliam"
    },
    {
      nom: 'Forfait Camélia - Coiffure',
      en: 'Camellia Package - Hair',
      desc: "Camélia - Coiffure",
      prix: 240,
      bride: true,
      time: 60,
      maquillage: false,
      coiffure: true,
      id:"cameliac"
    },
    {
      nom: 'Forfait Jasmin',
      en: 'Jasmine Package',
      desc: "Jasmin - Maquillage ET Coiffure ET 1 Evenement +",
      prix: 650,
      bride: true,
      time: 120,
      maquillage: true,
      coiffure: true,
      id:"jasmin"
    },
    {
      nom: 'Forfait Pivoine',
      en: 'Peony Package',
      desc: "Pivoine - Maquillage ET Coiffure ET Retouches jusqu'à Cérémonie",
      prix: 580,
      bride: true,
      time: 120,
      maquillage: true,
      coiffure: true,
      id:"pivoine"
    },
    {
      nom: 'Forfait Rose Eternelle',
      en: 'Eternal Rose Package',
      desc: "Rose Eternelle - Maquillage ET Coiffure ET Accompagnement Journée + Soirée",
      prix: '?',
      bride: true,
      time: 120,
      maquillage: true,
      coiffure: true,
      id:"rose"
    },
    {
      nom: 'Invitée (jour-J)',
      en: 'Guest (D-Day)',
      titre: true,
    },
    {
      nom: 'Forfait Anémone',
      en: 'Anemone Package',
      desc: "Anémone - Maquillage ET Coiffure",
      prix: 130,
      time: 75,
      maquillage: true,
      coiffure: true,
      id:"anemone"
    },
    {
      nom: 'Forfait Gypsophile - Maquillage',
      en: 'Baby\'s Breath Package - Makeup',
      desc: "Gypsophile - Maquillage",
      prix: 70,
      time: 45,
      maquillage: true,
      coiffure: false,
      id:"gypsom"
    },
    {
      nom: 'Forfait Gypsophile - Coiffure',
      en: 'Baby\'s Breath Package - Hair',
      desc: "Gypsophile - Coiffure",
      prix: 80,
      time: 45,
      maquillage: false,
      coiffure: true,
      id:"gypsoc"
    },
    {
      nom: 'Options',
      en: 'Options',
      titre: true,
    },
    {
      nom: 'Pose Faux-cils',
      en: 'False Lashes Application',
      prix: 10,
      id:"fauxcils"
    },
    {
      nom: 'Pose Faux-cils (bouquets)',
      en: 'False Lashes Application (Clusters)',
      prix: 0,
      id:"bouquets"
    },
    {
      nom: 'Maquillage Marié',
      en: 'Groom Makeup',
      prix: 30,
      time: 30,
      maquillage: true,
      id:"marie"
    },
    {
      nom: 'Suivi Mariée',
      en: 'Bride Follow-Up',
      prix: 50,
      hourly: true,
      id:"suivi"
    },
  ];
  data$ = this.dataSubject.asObservable();

  getData(password: string): void {
    const params = new HttpParams().set('pass', password);

    this.http.get<any>(this.apiUrl, { params })
      .pipe(
        tap(data => this.dataSubject.next(this.checkData(data)))
      )
      .subscribe({
        error: (err) => {
          this.dataSubject.next([{ error: err.error?.error || 'Erreur serveur' }]);
        }
      });
  }

  getBasePrestas(){return this.basePrestas;}

  checkData(data:Journee[])
  {
    data = data.filter((day=>day.statut!="essai"));

    data
          .filter((d: any) => d.essai && d.essai.date && d.essai.date != '')
          .forEach((d: any) => {
            let obj = {
              nom: d.nom,
              adresse: d.adresse,
              codepostal: d.codepostal,
              tel: d.tel,
              mail: d.mail,
              statut: Statut.Essai,
              date: d.essai.date,
              devis: {},
              factures: [],
              planning: {},
              essai: d.essai,
              etape: d.etape,
              mariage: d.mariage
            };
            data.push(obj);
          });

    //On switch les persos automatiquement à fini si on a dépassé la date
    data.filter((day=>day.statut=="perso"||day.statut=="essai"||day.statut=="autre"))
      .forEach((day=>{
        if(this.dateService.isPast(day.date))
          day.etape=999;
    }));

    data.filter(day=>day.devis.prestas).forEach(day=>{day.devis.prestas!.filter(presta=>!presta.kilorly).forEach(presta=>{
      let similarPresta = this.basePrestas.find((basePresta:any)=>basePresta.nom==presta.nom || basePresta.en==presta.en);
      if(similarPresta)
      {
        if(!presta.time)presta.time = similarPresta.time;
        if(!presta.bride)presta.bride = similarPresta.bride;
        if(!presta.coiffure)presta.coiffure = similarPresta.coiffure;
        if(!presta.maquillage)presta.maquillage = similarPresta.maquillage;
        if(!presta.prix)presta.prix = similarPresta.prix;
      }
    })});

    return data;
  }
}