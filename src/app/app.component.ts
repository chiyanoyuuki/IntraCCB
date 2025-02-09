import { CommonModule, Location } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, HostListener, Input, isDevMode, OnChanges, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterOutlet } from '@angular/router';
import * as Tesseract from 'tesseract.js';
import { PDFDocumentProxy, getDocument } from 'pdfjs-dist';
import * as pdfjsLib from 'pdfjs-dist';
import { DevisComponent } from './devis/devis.component';
import { from } from 'rxjs';
import Swal from 'sweetalert2';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, FormsModule, CommonModule, DevisComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit{

  @ViewChild('devis') devis!: DevisComponent;

  months: string[] = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];


  year = 2025;

 jourClicked : any = undefined;
 jourClickedSave : any = undefined;

  weekDays: string[] = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  occupiedDates: any[] = [];

  tooltip = {
    visible: false,
    x: 0,
    y: 0,
    data: null as any
  };
  diffs:any = undefined;
  lang = 'fra';
  extractedText: string = '';
  loading: boolean = false;

  etapes = ["Devis","Arrhes"];
  changed = false;
  event = 0;
  search = "";
  portrait = false;
  month : any = undefined;
  monthIndex: any = undefined;
  selectedValue: any = null;

  mdp = "";
  okmdp = false;

  public innerWidth: any = window.outerWidth;
  public innerHeight: any = window.outerHeight;

  constructor(private http: HttpClient, private location: Location){}

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.innerHeight = event.target.innerHeight;
    this.innerWidth = event.target.innerWidth;

    if (event.target.innerHeight > event.target.innerWidth)this.portrait = true;
    else this.portrait = false;
  }

  @HostListener('window:popstate', ['$event'])
  onPopState(event: Event) {
    if(!this.jourClicked && this.portrait && this.month){this.month=undefined;this.monthIndex=undefined;}
    else if(this.jourClicked && this.portrait && !this.jourClicked.mode)this.onRetour();
    else if(this.jourClicked && this.portrait && this.jourClicked.mode)this.jourClicked.mode = undefined;

    // Bloquer la navigation en remettant l'URL actuelle
    this.location.forward();
  }


  ngOnInit()
  {
    document.addEventListener('backbutton', (event) => {
      if(!this.jourClicked && this.portrait && this.month){this.month=undefined;this.monthIndex=undefined;}
      else if(this.jourClicked && this.portrait && this.jourClicked.mode == 'undefined')this.onRetour();
      else if(this.jourClicked && this.portrait && this.jourClicked.mode != 'undefined')this.jourClicked.mode = undefined;
      event.preventDefault(); // Empêche le retour en arrière
      event.stopPropagation();
    }, false);

    (pdfjsLib as any).GlobalWorkerOptions.workerSrc = "pdf.worker.js";

    if (this.innerHeight > this.innerWidth)this.portrait = true;
  }

  init()
  {
    this.getData();
  }

  onInput(value:any): void {
    value = value.replace(/\D/g, '');
    if (value.length > 2) value = value.slice(0, 2) + '/' + value.slice(2);
    if (value.length > 5) value = value.slice(0, 5) + '/' + value.slice(5);
    return value;
  }

  otherMonth(i:number)
  {
    this.monthIndex = this.monthIndex + i;
    if(this.monthIndex<0)
    {
      this.monthIndex = 11;
      this.year = this.year - 1;
    }
    else if(this.monthIndex == 12)
    {
      this.monthIndex = 0;
      this.year = this.year + 1;
    }
    this.month = this.months[this.monthIndex];
  }

  clickMonth(month: any, monthIndex:any)
  {
    if(!this.portrait) return;
    this.month = month;
    this.monthIndex = monthIndex;
  }

  findDifferences(obj1: any, obj2: any): any {
    let differences: any = {};
  
    // Récupérer toutes les clés uniques des deux objets
    const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);
  
    allKeys.forEach(key => {
      const val1 = obj1[key];
      const val2 = obj2[key];
  
      if (typeof val1 === "object" && typeof val2 === "object" && val1 !== null && val2 !== null) {
        // 🔄 Si les valeurs sont des objets, comparer récursivement
        const diff = this.findDifferences(val1, val2);
        if (Object.keys(diff).length > 0) {
          differences[key] = diff;
        }
      } else if (val1 !== val2) {
        // 📌 Si les valeurs sont différentes, les stocker
        differences[key] = { from: val1, to: val2 };
      }
    });
  
    return differences;
  }  

  onRetour(i:number=0) : any{
    this.jourClicked.mode=undefined;
    this.jourClickedSave.mode=undefined;
    this.jourClicked.factureClicked=-1;
    this.jourClickedSave.factureClicked=-1;
    if(this.jourClicked)
    if (JSON.stringify(this.jourClicked) !== JSON.stringify(this.jourClickedSave)) {
      this.diffs = this.findDifferences(this.jourClicked,this.jourClickedSave);
      Swal.fire({
        title: 'Attention',
        text: 'Vous avez des modifications non enregistrées. Voulez-vous vraiment quitter ?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Oui',
        cancelButtonText: 'Annuler'
      }).then((result) : any => {
        if (result.isConfirmed) {
          if(i==0){
            this.jourClicked = undefined;
            this.search = "";}
          else if(i==1||i==-1)this.changeEvent(i);
          else if(i==2)
          {
            this.diffs = undefined;
            this.jourClicked = {date:this.jourClicked.date,statut:"demande",etape:0,factures:[], devis:{}, planning:{}, essai:{}};
            this.jourClickedSave = JSON.parse(JSON.stringify(this.jourClicked));
          }
        }
      });
    }
    else
    {
      if(i==0){this.jourClicked = undefined;
        this.search = "";}
      else if(i==1||i==-1)this.changeEvent(i);
      else if(i==2)
      {
        this.diffs = undefined;
        this.jourClicked = {date:this.jourClicked.date,statut:"demande",etape:0,factures:[], devis:{}, planning:{}, essai:{}};
        this.jourClickedSave = JSON.parse(JSON.stringify(this.jourClicked));
      }
    }
  }

  isAnt(mois:any, jour:any, year:any)
  {
    const dateDonnee = new Date(year, mois, jour);
    const aujourdHui = new Date();
    aujourdHui.setHours(0, 0, 0, 0); 
    return dateDonnee < aujourdHui;
  }

  getData()
  {
    this.http.get<any>('http'+(isDevMode()?'':'s')+'://chiyanh.cluster031.hosting.ovh.net/cloeplanning').subscribe(data=>
      {
        console.log("HTTP : CloePlanning", data);
        this.occupiedDates = data;

        data.filter((d:any)=>d.essai&&d.essai.date&&d.essai.date!="").forEach((d:any)=>{
          let obj = {nom:d.nom,adresse:d.adresse,codepostal:d.codepostal,tel:d.tel,mail:d.mail,statut:"essai",date:d.essai.date,devis:{},factures:[],planning:{},essai:d.essai,etape:d.etape};
          const [jour, mois, annee] = obj.date.split('/').map(Number);
          const dateDonnee = new Date(annee, mois - 1, jour);
          const aujourdHui = new Date();
          aujourdHui.setHours(0, 0, 0, 0); 
          if(dateDonnee < aujourdHui) obj.etape=999;
          this.occupiedDates.push(obj);
        });

        //this.showNumeros();
        //this.checkNumerosDevis();
        //this.checkNumerosFactures();
      });
  }

  showNumeros()
  {
    let devis = this.occupiedDates.filter((d:any)=>d.devis.creation).sort((a:any,b:any)=>{return this.toSortableDate(a.devis.creation) - this.toSortableDate(b.devis.creation)});
    devis.forEach((dev:any)=>{
      let d : any = JSON.parse(JSON.stringify(dev));
      let ligne = d.nom+" : DEVIS_"+this.formatNumber(d.devis.numero)+"_"+d.devis.annee+" ("+d.devis.creation+")";
      d.factures.forEach((f:any)=>{
        ligne += " FACTURE_"+this.formatNumber(f.numero)+"_"+f.annee+" ("+f.creation+")";
      })
      console.log(ligne);
    });
  }

  checkNumerosDevis()
  {
    let devis = this.occupiedDates.filter((d:any)=>d.devis.creation).sort((a:any,b:any)=>{return this.toSortableDate(a.devis.creation) - this.toSortableDate(b.devis.creation)});
    console.log(devis);
    let requete = "";
    let numero = 1;
    let annee = devis[0].devis.annee;
    devis.forEach((dev:any)=>{
      let d : any = JSON.parse(JSON.stringify(dev));
      if(d.devis.annee!=annee)
      {
        numero = 1;
        annee = d.devis.annee;
      }
      d.devis.numero = numero++;
      requete += "UPDATE cloeplanning SET devis = '" + JSON.stringify(d.devis) + "' WHERE ID = "+ d.id + ";\n";
      console.log(d.nom+" "+d.devis.numero+"-"+d.devis.annee+" "+d.devis.creation);
    });
    console.log(requete);
  }

  checkNumerosFactures(): any {
    let tableau : any = this.occupiedDates.filter((d:any)=>d.factures.length>0);
    // 1️⃣ Récupérer toutes les factures dans un seul tableau
    const allFactures: any = tableau.flatMap((obj:any) =>
      obj.factures.map((facture:any) => ({ ...facture, tableauId: obj.id, nom:obj.nom }))
    );
  
    // 2️⃣ Trier les factures par date (de la plus ancienne à la plus récente)
    allFactures.sort((a:any, b:any) => {
      const [dayA, monthA, yearA] = a.creation.split('/').map(Number);
      const [dayB, monthB, yearB] = b.creation.split('/').map(Number);
      return new Date(yearA, monthA - 1, dayA).getTime() - new Date(yearB, monthB - 1, dayB).getTime();
    });

    let requete = "";
    let numero = 1;
    let annee = allFactures[0].annee;

    allFactures.forEach((facture:any)=>{
      if(facture.annee!=annee)
      {
        console.log("anneediff");
        numero = 1;
        annee = facture.annee;
      }
      let date = this.occupiedDates.find((d:any)=>d.id==facture.tableauId);
      let fac = date.factures.find((f:any)=>f.creation==facture.creation&&JSON.stringify(f.prestas)===JSON.stringify(facture.prestas));
      fac.numero = numero++;
    });

    requete = "";
    
    this.occupiedDates.filter((d:any)=>d.factures.length>0).forEach((dev:any)=>{
      let d : any = JSON.parse(JSON.stringify(dev));
      requete += "UPDATE cloeplanning SET factures = '" + JSON.stringify(d.factures) + "' WHERE ID = "+ d.id + ";\n";
      d.factures.forEach((f:any)=>{
        console.log(d.nom+" "+f.numero+"-"+f.annee+" "+f.creation);
      })
    });
    console.log(requete);
  }

  toSortableDate(date:any)
  {
    const [day, month, year] = date.split('/').map(Number);
    return new Date(year, month - 1, day).getTime();
  }

  otherEvents()
  {
    return this.occupiedDates.filter((d:any)=>d.date==this.jourClicked.date).length;
  }

  goToWed()
  {
    this.jourClicked = this.occupiedDates.find((d:any)=>d.statut!="essai"&&d.essai&&d.essai.date==this.jourClicked.date&&d.nom==this.jourClicked.nom);
    this.jourClickedSave = JSON.parse(JSON.stringify(this.jourClicked));
  }

  getDaysInMonth(year: number, month: number): number[] {
    const days = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: days }, (_, i) => i + 1);
  }
  
  getFirstDayOfMonth(year: number, month: number): number {
    return new Date(year, month, 1).getDay(); // 0 = Dimanche, 1 = Lundi, etc.
  }

  isOccupied(year: number, month: number, day: number): any {
    const dateStr = `${day.toString().padStart(2, '0')}/${(month + 1).toString().padStart(2, '0')}/${year}`;
    let date = this.occupiedDates.find((d:any)=>d.date==dateStr && (this.search!=""?JSON.stringify(d).toLowerCase().includes(this.search.toLowerCase()):true));
    return this.getClass(date);
  }

  calcToString(presta:any)
  {
    if(presta.qte=="?")return "";
    let prix = this.calc(presta);
    if(prix==0) return "Offert";
    return prix + (prix<100?',00':'') + '€';
  }

  calc(presta: any) {
    let prix = presta.prix * presta.qte;
    if(presta.kilorly)
    {
      if(presta.qte <= 10) prix = 0;
      else
      {
        prix = (presta.qte - 10) * 2 * presta.prix;
      }
    }
    if (presta.reduc) prix = prix - (prix * presta.reduc) / 100;
    if(Number.isInteger(presta.prix) || presta.kilorly)prix = Math.floor(prix);
    return prix;
  }

  calcTot(calcDeja: boolean = false) {
    let prix = 0;
    this.jourClicked.devis.prestas
      .filter((presta: any) => presta.qte > 0)
      .forEach((presta: any) => {
        prix += this.calc(presta);
      });
    //if (calcDeja && this.values[15] != '') prix = prix - this.values[15];
    prix = Math.floor(prix);
    return prix + (prix<100?',00':'') + '€';
  }

  calcares() {
    let prix = 0;
    this.jourClicked.devis.prestas
      .filter((presta: any) => presta.bride && presta.qte > 0)
      .forEach((presta: any) => {
        prix += this.calc(presta);
      });
    if (prix != 0) prix = 0.3 * prix;
    prix = Math.floor(prix);
    return prix + (prix<100?',00':'') + '€';
  }

  calcPaye()
  {
    let prix = 0;
    this.jourClicked.factures.forEach((f:any)=>{
      if(f.solde) prix += parseFloat(f.solde);
      else
      {
        f.prestas.forEach((presta:any)=>{
          prix+=this.calc(presta);
        })
      }
    })
    return this.transform(prix) + '€' + (this.jourClicked.factures.length==1?" ("+this.jourClicked.factures[0].creation+")":"");
  }

  transform(value: number): string {
    if (typeof value !== 'number' || isNaN(value)) {
      return ''; // Gérer les valeurs invalides
    }

    if (Number.isInteger(value)) {
      if (value < 100) {
        return value.toFixed(2).replace('.', ','); // Ajoute ,00
      } else {
        return value.toString(); // Garde l'entier
      }
    }

    return value.toFixed(2).replace('.', ','); // Affiche avec 2 décimales
  }

  getClass(date:any)
  {
    if(date)
    {
      if(date.etape==999) return "over"
      else return date.statut;
    }
    return "nothing";
  }

  getMaxs()
  {
    let tableau : any = this.occupiedDates;
    const currentYear = new Date().getFullYear(); // 🔥 Année actuelle

    // 1️⃣ Récupérer tous les numéros des devis de cette année
    const devisNumbers = tableau.filter((d:any)=>d.devis.creation)
      .filter((obj:any) => {
        const [day, month, year] = obj.devis.creation.split('/').map(Number);
        return year === currentYear;
      })
      .map((obj:any) => obj.devis.numero);

    // 2️⃣ Récupérer tous les numéros des factures de cette année
    const factureNumbers = tableau.filter((d:any)=>d.factures.length>0)
      .flatMap((obj:any) => obj.factures) // 🔹 Regroupe toutes les factures
      .filter((facture:any) => {
        const [day, month, year] = facture.creation.split('/').map(Number);
        return year === currentYear;
      })
      .map((facture:any) => facture.numero);

    // 3️⃣ Trouver le max ou retourner `null` si aucun résultat
    const maxDevis = devisNumbers.length > 0 ? Math.max(...devisNumbers) : null;
    const maxFacture = factureNumbers.length > 0 ? Math.max(...factureNumbers) : null;

    return { maxDevis, maxFacture };
  }

  clickDevis()
  {
    this.jourClicked.mode='devis';
    this.devis.init(this.getMaxs());
  }
  clickFacture(i:any = undefined)
  {
    if(i){this.jourClicked.factureClicked = i.target.value;}
    else this.jourClicked.factureClicked = -1;
    this.jourClicked.mode='facture';
    this.devis.init(this.getMaxs());
    this.selectedValue = null;
  }

  showTooltip(event: MouseEvent, monthIndex: number, day: number): void {
    if(this.isOccupied(this.year,monthIndex,day)=="nothing")return;
    const dateStr = `${day.toString().padStart(2, '0')}/${(monthIndex + 1).toString().padStart(2, '0')}/${this.year}`;
    let date = this.occupiedDates.filter((d:any)=>d.date==dateStr);
    this.tooltip.visible = true;
    this.tooltip.x = event.clientX + 10; // Décalage pour éviter de cacher la souris
    this.tooltip.y = event.clientY + 10;
    this.tooltip.data = date;
  }

  numberOfEvents(monthIndex: number, day: number): any {
    if(this.isOccupied(this.year,monthIndex,day)=="nothing")return;
    const dateStr = `${day.toString().padStart(2, '0')}/${(monthIndex + 1).toString().padStart(2, '0')}/${this.year}`;
    let date = this.occupiedDates.filter((d:any)=>d.date==dateStr);
    return date.length>1?date.length:"";
  }

  hideTooltip(): void {
    this.tooltip.visible = false;
  }

  

  formatDate(dateStr: string): string {
    // Convertir la date "06/02/2025" en objet Date (Format: dd/mm/yyyy)
    const [day, month, year] = dateStr.split('/').map(Number);
    const date = new Date(year, month - 1, day); // Mois commence à 0 en JS

    // Formater la date en français
    const formatter = new Intl.DateTimeFormat('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    // Mettre la première lettre en majuscule
    return formatter.format(date).replace(/( |^)\p{L}/gu, char => char.toUpperCase());
}

  clickJour(mois:any, jour:any, year:any)
  {
    this.diffs = undefined;
    this.event = 0;
    this.hideTooltip();
    const dateStr = `${jour.toString().padStart(2, '0')}/${(mois + 1).toString().padStart(2, '0')}/${year}`;
    let date = this.occupiedDates.find((d:any)=>d.date==dateStr);
    if(date)
    {
      this.jourClicked = this.occupiedDates.filter((d:any)=>d.date==dateStr)[this.event];
      this.jourClickedSave = JSON.parse(JSON.stringify(this.jourClicked));
    }
    else
    {
      this.jourClicked = {date:dateStr,statut:"demande",etape:0,factures:[], devis:{}, planning:{}, essai:{}};
      this.jourClickedSave = JSON.parse(JSON.stringify(this.jourClicked));
    }
  }

  getEtape()
  {
    let etape = this.jourClicked.etape;
    if(etape==0){return "Créer un devis";}
    else if(etape==1){return "Facture arrhes";}
    else if(etape==2){return "Facture finale";}
    else if(etape==999){return "Evénement terminé";}
    return "N/A";
  }
  clickEtape()
  {
    let etape = this.jourClicked.etape;
    if(etape==0){this.clickDevis();}
    if(etape==1){this.clickFacture();}
    if(etape==2){this.clickFacture();}
  }


  changeJour(i:number)
  {
    const [day, month, year] = this.jourClicked.date.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + i);
    const previousDay = date.getDate();
    const previousMonth = date.getMonth()
    const previousYear = date.getFullYear();
    this.clickJour(previousMonth,previousDay,previousYear);
  }

  changeEvent(i:any)
  {
    this.diffs = undefined;
    this.event += i;
    if(this.event>=this.otherEvents())this.event = 0;
    else if(this.event<0)this.event=this.otherEvents()-1;
    this.jourClicked = this.occupiedDates.filter((d:any)=>d.date==this.jourClicked.date)[this.event];
    this.jourClickedSave = JSON.parse(JSON.stringify(this.jourClicked)); 
  }

  end()
  {
    this.jourClicked.etape=999;
    this.save();
  }

  save()
  {
    let exist = this.occupiedDates.find((d:any)=>d.date==this.jourClicked.data);
    if(!exist){this.occupiedDates.push(this.jourClicked);}

    const data : any = {factures:[],devis:{},planning:{},etape:0,date:this.jourClicked.date};
    if(this.jourClicked.id)data.id = this.jourClicked.id;
    if(this.jourClicked.date)data.date = this.jourClicked.date;
    if(this.jourClicked.nom)data.nom = this.jourClicked.nom;
    if(this.jourClicked.statut)data.statut = this.jourClicked.statut;
    if(this.jourClicked.adresse)data.adresse = this.jourClicked.adresse;
    if(this.jourClicked.codepostal)data.codepostal = this.jourClicked.codepostal;
    if(this.jourClicked.mail)data.mail = this.jourClicked.mail;
    if(this.jourClicked.essai)data.essai = this.jourClicked.essai;
    if(this.jourClicked.prestataires)data.prestataires = this.jourClicked.prestataires;
    if(this.jourClicked.tel)data.tel = this.jourClicked.tel;
    if(this.jourClicked.etape)data.etape = this.jourClicked.etape;
    if(this.jourClicked.devis)data.devis = this.jourClicked.devis;
    if(this.jourClicked.factures)data.factures = this.jourClicked.factures;
    if(this.jourClicked.planning)data.planning = this.jourClicked.planning;

    exist = this.jourClicked.id != undefined;

    from(
      fetch(
        'http'+(isDevMode()?'':'s')+'://chiyanh.cluster031.hosting.ovh.net/cloeplanning' + (exist?'update':'create'),
        {
          body: JSON.stringify(data),
          headers: {
            'Content-Type': 'application/json',
          },
          method: 'POST',
          mode: 'no-cors',
        }
      ).then((data:any)=>{
        this.getData();
      })
    );

    this.jourClicked = undefined;
    this.search = "";
  }

  delete()
  {
    Swal.fire({
      title: 'Attention',
      text: 'Voulez vous vraiment supprimer ces données ?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Oui',
      cancelButtonText: 'Annuler'
    }).then((result) : any => {
      if (result.isConfirmed) {
        let data = {id:this.jourClicked.id};
        from(
          fetch(
            'http'+(isDevMode()?'':'s')+'://chiyanh.cluster031.hosting.ovh.net/cloeplanningdelete',
            {
              body: JSON.stringify(data),
              headers: {
                'Content-Type': 'application/json',
              },
              method: 'POST',
              mode: 'no-cors',
            }
          ).then((data:any)=>{
            this.getData();
          })
        );

        this.jourClicked = undefined;
        this.search = "";
      }
    });
  }

  formatNumber(num:number) {
    return String(num).padStart(3, '0');
  }

  checkMdp()
  {
    if(this.mdp==environment.password)this.okmdp = true;
    this.init();
  }
}