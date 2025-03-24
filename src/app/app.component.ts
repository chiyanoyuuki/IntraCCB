import { CommonModule, Location, LocationStrategy } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  Component,
  HostListener,
  Input,
  isDevMode,
  OnChanges,
  OnInit,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
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
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  @ViewChild('devis') devis!: DevisComponent;

  safedev = true;
  artiste="cloe";

  months: string[] = [
    'Janvier',
    'Février',
    'Mars',
    'Avril',
    'Mai',
    'Juin',
    'Juillet',
    'Août',
    'Septembre',
    'Octobre',
    'Novembre',
    'Décembre',
  ];

  year = 2025;

  jourClicked: any = undefined;
  jourClickedSave: any = undefined;

  weekDays: string[] = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  occupiedDates: any[] = [];
  prochain: any;

  tooltip = {
    visible: false,
    x: 0,
    y: 0,
    data: null as any,
  };
  diffs: any = undefined;
  lang = 'fra';
  extractedText: string = '';
  loading: boolean = false;

  alldevis:any = [];
  allfactures:any = [];
  allplannings:any = [];
  allWedding:any = [];
  alldev:any=undefined;
  allfac:any=undefined;
  allwed:any=undefined;
  allrens:any=undefined;

  etapes = ['Devis', 'Arrhes'];
  changed = false;
  event = 0;
  search = '';
  portrait = false;
  month: any = undefined;
  monthIndex: any = undefined;
  selectedValue: any = null;

  monthsvalues: any = [];

  mdp = '';
  okmdp = false;

  public innerWidth: any = window.outerWidth;
  public innerHeight: any = window.outerHeight;

  constructor(private http: HttpClient, private location: Location) {}

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.innerHeight = event.target.innerHeight;
    this.innerWidth = event.target.innerWidth;

    if (event.target.innerHeight > event.target.innerWidth)
      this.portrait = true;
    else this.portrait = false;
  }

  @HostListener('window:popstate', ['$event'])
  onPopState(event: Event) {
    if(!isDevMode())
    {
      history.pushState(null, '', location.href);
      event.preventDefault();
      event.stopPropagation();
      this.onMobileReturn();
    }
  }

  public test() {}

  onMobileReturn() {
    history.pushState(null, '', location.href);
    if(this.jourClicked.leavewhenreturn){
      this.jourClicked = undefined;
    }
    else if (!this.jourClicked && this.portrait && this.month) {
      this.month = undefined;
      this.monthIndex = undefined;
    } else if (this.jourClicked && this.portrait && !this.jourClicked.mode)
      this.onRetour();
    else if (this.jourClicked && this.portrait && this.jourClicked.mode)
      this.jourClicked.mode = undefined;
    history.pushState(null, '', location.href);
  }

  ngOnInit() {

    if(isDevMode())
    {
      this.okmdp = true;
      this.init();
    }

    if(! isDevMode())
    {
      window.addEventListener('beforeunload', (event: any) => {
        event.preventDefault();
        event.returnValue = '';
        this.onMobileReturn();
      });
  
      history.pushState(null, '', location.href);
  
      window.addEventListener('backbutton', (event) => {
        if(isDevMode())return;
        history.pushState(null, '', location.href);
        event.preventDefault();
        event.stopPropagation();
        this.onMobileReturn();
      });
    }

    (pdfjsLib as any).GlobalWorkerOptions.workerSrc = 'pdf.worker.js';

    if (this.innerHeight > this.innerWidth) this.portrait = true;
  }

  onDevisRetour()
  {
    if(this.portrait&&!this.month) this.jourClicked = undefined;
    else this.jourClicked.mode=undefined;
    this.cancelViewport();
  }

  cancelViewport(){
    let int = setInterval(()=>{
    const metaViewport = document.querySelector("meta[name=viewport]");
    if (metaViewport) {
      metaViewport.setAttribute(
        "content",
        `width=device-width, initial-scale=1`
      );
    }
    window.scrollTo({ top: 0, left: 0 });document.documentElement.scrollIntoView();document.documentElement.scrollTop = 0;document.body.scrollTop = 0;clearInterval(int);},100);

  }

  init() {
    this.getData();
  }

  onInput(value: any): void {
    value = value.replace(/\D/g, '');
    if (value.length > 2) value = value.slice(0, 2) + '/' + value.slice(2);
    if (value.length > 5) value = value.slice(0, 5) + '/' + value.slice(5);
    return value;
  }

  sendEmail() {
    const to = this.jourClicked.mail;
    const subject = encodeURIComponent('Disponibilité pour votre mariage du '+this.formatDate(this.jourClicked.date));
    const body = encodeURIComponent('Bonjour '+this.jourClicked.nom+',\n\n'
      +'J’espère que vous allez bien.\n\n'
      +'Je me permets de revenir vers vous concernant votre mariage du '+this.formatDate(this.jourClicked.date)+' prochain.\n'
      +'N’ayant pas encore reçu de confirmation de votre part, je souhaitais savoir si vous souhaitiez toujours faire appel à mes services.\n\n'
      +'À noter que j’ai récemment reçu une autre demande pour cette même date.\n'
      +'Afin de pouvoir organiser mon planning au mieux, pourriez-vous me tenir informée de votre décision ?\n\n'
      +'N’hésitez pas à me contacter si vous avez la moindre question.\n\n'
      +'Au plaisir d’échanger avec vous,\n'
      +'Belle journée à vous. 🌞\n'
    );
    
    if(this.jourClicked.mail)
    {
      const mailtoLink = `mailto:${to}?subject=${subject}&body=${body}`;
      window.location.href = mailtoLink;
    }
    else if(this.jourClicked.mariagenet&&this.jourClicked.mariagenet!="")
    {
      navigator.clipboard.writeText(decodeURIComponent(body));
      window.open("https://www.mariages.net/emp-AdminSolicitudesShow.php?id_solicitud="+this.jourClicked.mariagenet, '_blank');
    }
    else
    {
      navigator.clipboard.writeText(decodeURIComponent(body));
    }
  }

  sendEmails() {
    let mariees = this.occupiedDates.filter((d:any)=>d.statut=="demande"&&d.mail&&d.mail!="");
    mariees = mariees.map((m:any)=>m.mail);

    const to = "cloe.chaudron@outlook.com";
    const cc = [].join(',');
    const bcc = mariees.join(',');
    const subject = encodeURIComponent('Disponibilité pour votre mariage');
    const body = encodeURIComponent('Bonjour Madame,\n\n'
      +'J’espère que vous allez bien.\n\n'
      +'Je me permets de revenir vers vous concernant votre mariage.\n'
      +'N’ayant pas encore reçu de confirmation de votre part, je souhaitais savoir si vous souhaitiez toujours faire appel à mes services.\n\n'
      +'À noter que j’ai récemment reçu une autre demande pour cette même date.\n'
      +'Afin de pouvoir organiser mon planning au mieux, pourriez-vous me tenir informée de votre décision ?\n\n'
      +'N’hésitez pas à me contacter si vous avez la moindre question.\n\n'
      +'Au plaisir d’échanger avec vous,\n'
      +'Belle journée à vous. 🌞\n'
    );

    const mailtoLink = `mailto:${to}?cc=${cc}&bcc=${bcc}&subject=${subject}&body=${body}`;
    window.location.href = mailtoLink;
  }

  otherMonth(i: number) {
    this.monthIndex = this.monthIndex + i;
    if (this.monthIndex < 0) {
      this.monthIndex = 11;
      this.year = this.year - 1;
    } else if (this.monthIndex == 12) {
      this.monthIndex = 0;
      this.year = this.year + 1;
    }
    this.month = this.months[this.monthIndex];
  }

  clickMonth(month: any, monthIndex: any) {
    if (!this.portrait) return;
    this.month = month;
    this.monthIndex = monthIndex;
  }

  findDifferences(obj1: any, obj2: any): any {
    let differences: any = {};

    // Récupérer toutes les clés uniques des deux objets
    const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);

    allKeys.forEach((key) => {
      const val1 = obj1[key];
      const val2 = obj2[key];

      if (
        typeof val1 === 'object' &&
        typeof val2 === 'object' &&
        val1 !== null &&
        val2 !== null
      ) {
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

  onRetour(i: number = 0): any {
    this.jourClicked.mode = undefined;
    this.jourClickedSave.mode = undefined;
    this.jourClicked.factureClicked = -1;
    this.jourClickedSave.factureClicked = -1;
    this.diffs = this.findDifferences(this.jourClicked, this.jourClickedSave);

    if (Object.keys(this.diffs).length > 0) {
      Swal.fire({
        title: 'Attention',
        text: 'Vous avez des modifications non enregistrées. Voulez-vous vraiment quitter ?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Oui',
        cancelButtonText: 'Annuler',
      }).then((result): any => {
        if (result.isConfirmed) {
          if (i == 0) {
            this.jourClicked = undefined;
            this.search = '';
          } else if (i == 1 || i == -1) this.changeEvent(i);
          else if (i == 2) {
            this.diffs = undefined;
            this.jourClicked = {
              date: this.jourClicked.date,
              statut: 'demande',
              etape: 0,
              factures: [],
              devis: {},
              planning: {},
              essai: {},
              mariage: {},
            };
            this.jourClickedSave = JSON.parse(JSON.stringify(this.jourClicked));
          }
        }
      });
    } else {
      if (i == 0) {
        this.jourClicked = undefined;
        this.search = '';
      } else if (i == 1 || i == -1) this.changeEvent(i);
      else if (i == 2) {
        this.diffs = undefined;
        this.jourClicked = {
          date: this.jourClicked.date,
          statut: 'demande',
          etape: 0,
          factures: [],
          devis: {},
          planning: {},
          essai: {},
          mariage: {},
        };
        this.jourClickedSave = JSON.parse(JSON.stringify(this.jourClicked));
      }
    }
  }

  isAnt(mois: any, jour: any, year: any) {
    const dateDonnee = new Date(year, mois, jour);
    const aujourdHui = new Date();
    aujourdHui.setHours(0, 0, 0, 0);
    return dateDonnee < aujourdHui;
  }

  getData() {
    if(this.safedev&&isDevMode())
    {
      if(this.artiste=="celma")
      {
        document.documentElement.style.setProperty('--fond', '#8dba8238');
        document.documentElement.style.setProperty('--principale', '#8bba82');
        document.documentElement.style.setProperty('--scroll', '#638e523b');
        document.documentElement.style.setProperty('--gris-shadow', '#505050');
        document.documentElement.style.setProperty('--required', '#578e52');
        this.initData([{
          "id": 43,
          "date": "19/04/2025",
          "nom": "Charles Poure",
          "statut": "reserve",
          "adresse": "55 avenue foch",
          "codepostal": "52 344 Paris",
          "tel": "+33 6 55 22 11 44",
          "mail": "charles.poure@mail.com",
          "devis": {
            "prestas": [
              {
                "nom": "Frais de déplacement Jour-J (Aller/Retour)",
                "en": "D-Day Travel Expenses (Round Trip)",
                "prix": 0.4,
                "kilorly": true,
                "qte": 20
              },
              {
                "nom": "Forfait Mariée Complet",
                "en": "Complete Bride Package",
                "prix": 420,
                "onlyOne": true,
                "bride": true,
                "time": 120,
                "maquillage": true,
                "coiffure": true,
                "qte": 1
              },
              {
                "nom": "Forfait Invitée Complet",
                "en": "Complete Guest Package",
                "prix": 130,
                "time": 75,
                "maquillage": true,
                "coiffure": true,
                "qte": 1
              },
              {
                "nom": "Coiffure Invitée (Attache complète)",
                "en": "Guest Hairstyling (Full Updo)",
                "prix": 80,
                "time": 45,
                "coiffure": true,
                "qte": 1
              },
              {
                "nom": "Brushing Hollywoodien Invitée",
                "en": "Hollywood Blowout (Guest)",
                "prix": 70,
                "time": 45,
                "coiffure": true,
                "qte": 1
              },
              {
                "nom": "Suivi Mariée",
                "en": "Bride Follow-Up",
                "prix": 50,
                "hourly": true,
                "qte": 2
              }
            ],
            "creation": "24/02/2025",
            "numero": 1,
            "annee": "2025",
            "echeance": "10/03/2025"
          },
          "factures": [],
          "planning": {},
          "essai": {
            "date": "10/08/2025",
            "lieu": "Nul part"
          },
          "mariage": {
            "domaine": "Domaine de la vie",
            "adresse": "111 avenue jean",
            "codepostal": "67 854 apt"
          },
          "prestataires": 0,
          "etape": 1
        }]);
        this.clickJour(3,19,2025);
        let int = setInterval(()=>{this.clickFacture();clearInterval(int);},50);
        return;
      }
      this.http.get<any[]>('mockdata.json').subscribe(
        (data:any) => {
          console.log("Mock Data",data);
          this.initData(data);
          //m-1 pour le mois
          //this.clickJour(8,27,2025);
          //let int = setInterval(()=>{this.clickPlanning();clearInterval(int);},50);
        }
      );
    }
    else
    {
      this.http
      .get<any>(
        'http' +
          (isDevMode() ? '' : 's') +
          '://chiyanh.cluster031.hosting.ovh.net/cloeplanning.php?artiste='+this.artiste
      )
      .subscribe((data) => {
        console.log('HTTP : CloePlanning', data);
        this.initData(data);
      });
    }
  }

  initData(data:any)
  {
    this.occupiedDates = data;

        data
          .filter((d: any) => d.essai && d.essai.date && d.essai.date != '')
          .forEach((d: any) => {
            let obj = {
              nom: d.nom,
              adresse: d.adresse,
              codepostal: d.codepostal,
              tel: d.tel,
              mail: d.mail,
              statut: 'essai',
              date: d.essai.date,
              devis: {},
              factures: [],
              planning: {},
              essai: d.essai,
              etape: d.etape,
            };
            const [jour, mois, annee] = obj.date.split('/').map(Number);
            const dateDonnee = new Date(annee, mois - 1, jour);
            const aujourdHui = new Date();
            aujourdHui.setHours(0, 0, 0, 0);
            if (dateDonnee < aujourdHui) obj.etape = 999;
            this.occupiedDates.push(obj);
          });

          this.alldevis = this.occupiedDates.filter((d:any)=>d.devis&&d.devis.creation);

          this.allfactures = this.occupiedDates.filter((d: any) => d.factures.length > 0);
          this.allfactures = this.allfactures.flatMap((date:any) => 
            date.factures.map((facture:any) => ({
                ...date, 
                facture: facture
            }))
          );

        this.allWedding = this.occupiedDates.filter((date:any)=>date.statut!="essai");
        this.allWedding = this.allWedding.sort((a:any,b:any) => {
          let datea: any = new Date(a.date.split("/").reverse().join("-"));
          let dateb: any = new Date(b.date.split("/").reverse().join("-"));
          return datea - dateb;
        });
        console.log(this.allWedding);

        let grouped: any = {};
        this.occupiedDates.forEach(item => {
          const [day, month, year] = item.date.split("/"); // Extraire les parties de la date
          const key = `${month}-${year}`; // Clé sous forme "MM-YYYY"
  
          if (!grouped[key]) {
            grouped[key] = { mois: parseInt(month), annee: year, dates: [] };
          }
          grouped[key].dates.push(item);
        });
        this.monthsvalues = Object.values(grouped);

        const today = new Date();
        this.prochain = this.occupiedDates
        .map(obj => ({
            ...obj,
            dateObj: new Date(obj.date.split('/').reverse().join('-')) // Convertit "dd/mm/aaaa" en "aaaa-mm-dd"
        }))
        .filter(obj => obj.dateObj > today) // Filtre les dates futures
        .sort((a, b) => a.dateObj - b.dateObj) // Trie par date la plus proche
        [0];

        //this.showNumeros();
        //this.checkNumerosDevis();
        //this.checkNumerosFactures(2024);
        //showFactures();
  }

  getStatut(statut:any, i:any=-1)
  {
    let cpt = 0;
    let data = this.monthsvalues.filter((m:any)=>m.annee==this.year);
    if(this.month) data = this.monthsvalues.filter((m:any)=>m.annee==this.year&&parseInt(m.mois)==(this.monthIndex+1));
    data.forEach((d:any)=>{
      d.dates.forEach((date:any)=>{
        if(date.statut==statut||date.etape==statut) cpt++;
      })
    })
    return cpt;
  }

  alreadyPaid(i:any=-1)
  {
    let total:any = 0;
    let data = this.monthsvalues.filter((m:any)=>m.annee==this.year);
    if(this.month) data = this.monthsvalues.filter((m:any)=>m.annee==this.year&&parseInt(m.mois)==(this.monthIndex+1));
    data.forEach((d:any)=>{
      let dates = d.dates.filter((date:any)=>date.factures.length>0);
      dates.forEach((date:any)=>{
        if(date.etape==999)
        {
          if(date.devis&&date.devis.prestas)
          {
            date.devis.prestas.forEach((p:any)=>total+=parseFloat(this.calc(p)));
          }
        }
        else
        {
          date.factures.forEach((facture:any)=>{
            if(facture.solde)
              total+=parseFloat(facture.solde)
            else
            {
              facture.prestas.forEach((p:any)=>total+=parseFloat(this.calc(p)));
            }
          });
        }
      })
    })
    return parseInt(total)+"€";
  }

  notPaid(i:any=-1)
  {
    let total:any = 0;
    let data = this.monthsvalues.filter((m:any)=>m.annee==this.year);
    if(this.month) data = this.monthsvalues.filter((m:any)=>m.annee==this.year&&parseInt(m.mois)==(this.monthIndex+1));
    data.forEach((d:any)=>{
      let dates = d.dates.filter((dat:any)=>dat.etape!=999);
      dates.forEach((date:any)=>{
        if(date.devis&&date.devis.prestas)
        {
          date.devis.prestas.forEach((p:any)=>total+=parseFloat(this.calc(p)));
        }
        if(date.factures&&date.factures.length>0)
        {
          date.factures.forEach((f:any)=>{
            if(!f.solde)f.prestas.forEach((p:any)=>total-=parseFloat(this.calc(p)));
            else total-=parseFloat(f.solde);
          });
        }
      })
    })
    return parseInt(total)+"€";
  }

  totalThunes(i:any=-1)
  {
    let total:any = 0;
    let data = this.monthsvalues.filter((m:any)=>m.annee==this.year);
    if(this.month) data = this.monthsvalues.filter((m:any)=>m.annee==this.year&&parseInt(m.mois)==(this.monthIndex+1));
    data.forEach((d:any)=>{
      let dates = d.dates;
      dates.forEach((date:any)=>{
        if(date.devis&&date.devis.prestas)
        {
          date.devis.prestas.forEach((p:any)=>total+=parseFloat(this.calc(p)));
        }
        date.factures.forEach((f:any)=>{
          total-=parseFloat(f.paiementprestas?f.paiementprestas:0);
        })
      })
    })
    return parseInt(total)+"€ ("+parseInt(""+(total-(total*0.24)))+"€ net)";
  }

  totalThunes2(i:any=-1)
  {
    let total:any = 0;
    let data = this.monthsvalues.filter((m:any)=>m.annee==this.year);
    if(this.month) data = this.monthsvalues.filter((m:any)=>m.annee==this.year&&parseInt(m.mois)==(this.monthIndex+1));
    data.forEach((d:any)=>{
      let dates = d.dates.filter((dat:any)=>dat.statut!="demande");
      dates.forEach((date:any)=>{
        if(date.devis&&date.devis.prestas)
        {
          date.devis.prestas.forEach((p:any)=>total+=parseFloat(this.calc(p)));
        }
        date.factures.forEach((f:any)=>{
          total-=parseFloat(f.paiementprestas?f.paiementprestas:0);
        })
      })
    })
    return parseInt(total)+"€ ("+parseInt(""+(total-(total*0.24)))+"€ net)";
  }

  renforts(i:any=-1)
  {
    let total:any = 0;
    let data = this.monthsvalues.filter((m:any)=>m.annee==this.year);
    if(this.month) data = this.monthsvalues.filter((m:any)=>m.annee==this.year&&parseInt(m.mois)==(this.monthIndex+1));
    data.forEach((d:any)=>{
      let dates = d.dates;
      dates.forEach((date:any)=>{
        date.factures.forEach((f:any)=>{
          total+=parseFloat(f.paiementprestas?f.paiementprestas:0);
        })
      })
    })
    return parseInt(total)+"€";
  }

  getFullDate(dateStr:any)
  {
    const [day, month, year] = dateStr.split('/').map(Number);
    const date = new Date(year, month - 1, day); // Mois commence à 0 en JS

    // Formater la date en "Jeudi 12 avril"
    return new Intl.DateTimeFormat('fr-FR', {
        weekday: 'long', // Nom du jour en toutes lettres
        day: 'numeric', // Jour du mois
        month: 'long', // Nom du mois en toutes lettres
    }).format(date).split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  }

  getallfactures(){
    let factures = this.allfactures.filter((f: any) => f.facture.annee == this.year);
    factures = factures.sort((a:any,b:any)=>{return a.facture.numero - b.facture.numero;});
    return factures;
  }

  getallWed()
  {
    return this.allWedding.filter((date:any)=>date.date.split("/")[2]==this.year);
  }

  getalldevis(){
    let devis = this.alldevis.filter((f: any) => f.devis.annee == this.year);
    devis = devis.sort((a:any,b:any)=>{return a.devis.numero - b.devis.numero;});
    return devis;
  }

  showFactures() {
    let i = 1;
    let find = this.occupiedDates.find(
      (o: any) =>
        o.factures.length > 0 && o.factures.find((f: any) => f.numero == i)
    );
    console.log(find);
    while (find != undefined) {
      let facture = find.factures.find((f: any) => f.numero == i);
      console.log(
        find.nom +
          ' ' +
          facture.creation +
          ' ' +
          facture.numero +
          '_' +
          facture.annee
      );
      i++;
      find = this.occupiedDates.find(
        (o: any) =>
          o.factures.length > 0 && o.factures.find((f: any) => f.numero == i)
      );
    }
  }

  showNumeros() {
    let devis = this.occupiedDates
      .filter((d: any) => d.devis.creation)
      .sort((a: any, b: any) => {
        return (
          this.toSortableDate(a.devis.creation) -
          this.toSortableDate(b.devis.creation)
        );
      });
    devis.forEach((dev: any) => {
      let d: any = JSON.parse(JSON.stringify(dev));
      let ligne =
        d.nom +
        ' : DEVIS_' +
        this.formatNumber(d.devis.numero) +
        '_' +
        d.devis.annee +
        ' (' +
        d.devis.creation +
        ')';
      d.factures.forEach((f: any) => {
        ligne +=
          ' FACTURE_' +
          this.formatNumber(f.numero) +
          '_' +
          f.annee +
          ' (' +
          f.creation +
          ')';
      });
      console.log(ligne);
    });
  }

  checkNumerosDevis() {
    let devis = this.occupiedDates
      .filter((d: any) => d.devis.creation)
      .sort((a: any, b: any) => {
        return (
          this.toSortableDate(a.devis.creation) -
          this.toSortableDate(b.devis.creation)
        );
      });
    console.log(devis);
    let requete = '';
    let numero = 1;
    let annee = devis[0].devis.annee;
    devis.forEach((dev: any) => {
      let d: any = JSON.parse(JSON.stringify(dev));
      if (d.devis.annee != annee) {
        numero = 1;
        annee = d.devis.annee;
      }
      d.devis.numero = numero++;
      requete +=
        "UPDATE "+this.artiste+"planning SET devis = '" +
        JSON.stringify(d.devis) +
        "' WHERE ID = " +
        d.id +
        ';\n';
      console.log(
        d.nom +
          ' ' +
          d.devis.numero +
          '-' +
          d.devis.annee +
          ' ' +
          d.devis.creation
      );
    });
    console.log(requete);
  }

  checkNumerosFactures(year: any): any {
    let tableau: any = this.occupiedDates.filter(
      (d: any) => d.factures.length > 0
    );
    // 1️⃣ Récupérer toutes les factures dans un seul tableau
    let allFactures: any = tableau.flatMap((obj: any) =>
      obj.factures.map((facture: any) => ({
        ...facture,
        tableauId: obj.id,
        nom: obj.nom,
      }))
    );

    allFactures = allFactures.filter((f: any) => f.annee == year);

    // 2️⃣ Trier les factures par date (de la plus ancienne à la plus récente)
    allFactures.sort((a: any, b: any) => {
      const [dayA, monthA, yearA] = a.creation.split('/').map(Number);
      const [dayB, monthB, yearB] = b.creation.split('/').map(Number);
      return (
        new Date(yearA, monthA - 1, dayA).getTime() -
        new Date(yearB, monthB - 1, dayB).getTime()
      );
    });

    let requete = '';
    let numero = 1;
    let annee = allFactures[0].annee;

    allFactures.forEach((facture: any) => {
      if (facture.annee != annee) {
        numero = 1;
        annee = facture.annee;
      }
      let date = this.occupiedDates.find((d: any) => d.id == facture.tableauId);
      let fac = date.factures.find(
        (f: any) =>
          f.creation == facture.creation &&
          JSON.stringify(f.prestas) === JSON.stringify(facture.prestas)
      );
      fac.numero = numero++;
    });

    requete = '';

    this.occupiedDates
      .filter((d: any) => d.factures.length > 0)
      .forEach((dev: any) => {
        let d: any = JSON.parse(JSON.stringify(dev));
        requete +=
          "UPDATE "+this.artiste+"planning SET factures = '" +
          JSON.stringify(d.factures) +
          "' WHERE ID = " +
          d.id +
          ';\n';
        d.factures.forEach((f: any) => {
          console.log(
            d.nom + ' ' + f.numero + '-' + f.annee + ' ' + f.creation
          );
        });
      });
    console.log(requete);
  }

  toSortableDate(date: any) {
    const [day, month, year] = date.split('/').map(Number);
    return new Date(year, month - 1, day).getTime();
  }

  otherEvents() {
    return this.occupiedDates.filter(
      (d: any) => d.date == this.jourClicked.date
    ).length;
  }

  goToWed() {
    this.jourClicked = this.occupiedDates.find(
      (d: any) =>
        d.statut != 'essai' &&
        d.essai &&
        d.essai.date == this.jourClicked.date &&
        d.nom == this.jourClicked.nom
    );
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
    const dateStr = `${day.toString().padStart(2, '0')}/${(month + 1)
      .toString()
      .padStart(2, '0')}/${year}`;
    let date = this.occupiedDates.find(
      (d: any) =>
        d.date == dateStr &&
        (this.search != ''
          ? JSON.stringify(d).toLowerCase().includes(this.search.toLowerCase())
          : true)
    );
    return this.getClass(date);
  }

  calcToString(presta: any) {
    if (presta.qte == '?') return '';
    let prix = this.calc(presta);
    if (prix == 0) return 'Offert';
    return prix + (prix < 100 ? ',00' : '') + '€';
  }

  calc(presta: any):any {
    if(presta.qte=="?")return 0;
    let prix = presta.prix * presta.qte;
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

  calcTot(calcDeja: boolean = false) {
    let prix = 0;
    this.jourClicked.devis.prestas
      .filter((presta: any) => presta.qte > 0)
      .forEach((presta: any) => {
        prix += this.calc(presta);
      });
    //if (calcDeja && this.values[15] != '') prix = prix - this.values[15];
    prix = Math.floor(prix);
    return prix + (prix < 100 ? ',00' : '') + '€';
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
    return prix + (prix < 100 ? ',00' : '') + '€';
  }

  calcPaye() {
    let prix = 0;
    this.jourClicked.factures.forEach((f: any) => {
      if (f.solde) prix += parseFloat(f.solde);
      else {
        f.prestas.forEach((presta: any) => {
          prix += this.calc(presta);
        });
      }
    });
    return (
      this.transform(prix) +
      '€' +
      (this.jourClicked.factures.length == 1
        ? ' (' + this.jourClicked.factures[0].creation + ')'
        : '')
    );
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

  getClass(date: any) {
    if (date) {
      if (date.etape == 999) return 'over';
      else return date.statut;
    }
    return 'nothing';
  }

  getMaxs() {
    let tableau: any = this.occupiedDates;
    const currentYear = new Date().getFullYear(); // 🔥 Année actuelle

    // 1️⃣ Récupérer tous les numéros des devis de cette année
    const devisNumbers = tableau
      .filter((d: any) => d.devis.creation)
      .filter((obj: any) => {
        const [day, month, year] = obj.devis.creation.split('/').map(Number);
        return year === currentYear;
      })
      .map((obj: any) => obj.devis.numero);

    // 2️⃣ Récupérer tous les numéros des factures de cette année
    const factureNumbers = tableau
      .filter((d: any) => d.factures.length > 0)
      .flatMap((obj: any) => obj.factures) // 🔹 Regroupe toutes les factures
      .filter((facture: any) => {
        const [day, month, year] = facture.creation.split('/').map(Number);
        return year === currentYear;
      })
      .map((facture: any) => facture.numero);

    // 3️⃣ Trouver le max ou retourner `null` si aucun résultat
    const maxDevis = devisNumbers.length > 0 ? Math.max(...devisNumbers) : null;
    const maxFacture =
      factureNumbers.length > 0 ? Math.max(...factureNumbers) : null;

    return { maxDevis, maxFacture };
  }

  initDevis()
  {
    this.devis.init(this.getMaxs());
  }

  clickDevis() {
    this.jourClicked.mode = 'devis';
    this.initDevis();
  }
  openRenseignement() {
    this.jourClicked.mode = 'renseignement';
    this.initDevis();
  }
  clickFacture(i: any = undefined) {
    console.log(i);
    if (i!=undefined) {
      if(i.target)
      {
        this.jourClicked.factureClicked = i.target.value;
      }
      else
      {
        this.jourClicked.factureClicked = i;
      }
    } 
    else 
    {
      this.jourClicked.factureClicked = -1;
    }
    this.jourClicked.mode = 'facture';
    this.initDevis();
    this.selectedValue = null;
  }
  clickPlanning() {
    this.jourClicked.mode = 'planning';
    this.initDevis();
  }

  clickAllDevis(date:any)
  {
    if(this.alldev==undefined)return;
    this.jourClicked = this.occupiedDates.find((d:any)=>d.id==this.alldev.id);
    this.jourClicked.download = true;
    this.jourClickedSave = JSON.parse(JSON.stringify(this.jourClicked));
    let int = setInterval(()=>{this.clickDevis();clearInterval(int);},500);
  }

  clickAllWed(event:any)
  {
    let jour = this.allwed.date.split("/");
    this.clickJour(parseInt(jour[1])-1,parseInt(jour[0]),parseInt(jour[2]));
  }

  clickAllRens(event:any)
  {
    let jour = this.allrens.date.split("/");
    this.jourClicked = this.occupiedDates.find((d:any)=>d.id==this.allrens.id);
    this.jourClicked.leavewhenreturn = true;
    this.jourClickedSave = JSON.parse(JSON.stringify(this.jourClicked));
    let int = setInterval(()=>{this.openRenseignement();clearInterval(int);},10);
  }

  clickAllFactures(date:any)
  {
    if(this.allfac==undefined)return;
    this.jourClicked = this.occupiedDates.find((d:any)=>d.id==this.allfac.id);
    this.jourClicked.download = true;
    this.jourClickedSave = JSON.parse(JSON.stringify(this.jourClicked));
    let factures = this.jourClicked.factures;
    let index = 0;
    if(factures.length>1)
    {
      let facture = factures.find((f:any)=>f.numero==this.allfac.facture.numero&&f.creation==this.allfac.facture.creation);
      index = factures.indexOf(facture);
    }
    let int = setInterval(()=>{this.clickFacture(index);clearInterval(int);},10);
  }

  showTooltip(event: MouseEvent, monthIndex: number, day: number): void {
    if (this.isOccupied(this.year, monthIndex, day) == 'nothing') return;
    const dateStr = `${day.toString().padStart(2, '0')}/${(monthIndex + 1)
      .toString()
      .padStart(2, '0')}/${this.year}`;
    let date = this.occupiedDates.filter((d: any) => d.date == dateStr);
    this.tooltip.visible = true;
    this.tooltip.x = event.clientX + 10; // Décalage pour éviter de cacher la souris
    this.tooltip.y = event.clientY + 10;
    this.tooltip.data = date;
  }

  numberOfEvents(monthIndex: number, day: number): any {
    if (this.isOccupied(this.year, monthIndex, day) == 'nothing') return;
    const dateStr = `${day.toString().padStart(2, '0')}/${(monthIndex + 1)
      .toString()
      .padStart(2, '0')}/${this.year}`;
    let date = this.occupiedDates.filter((d: any) => d.date == dateStr);
    return date.length > 1 ? date.length : '';
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
      year: 'numeric',
    });

    // Mettre la première lettre en majuscule
    return formatter
      .format(date)
      .replace(/( |^)\p{L}/gu, (char) => char.toUpperCase());
  }

  clickJour(mois: any, jour: any, year: any) {
    this.diffs = undefined;
    this.event = 0;
    this.hideTooltip();
    const dateStr = `${jour.toString().padStart(2, '0')}/${(mois + 1)
      .toString()
      .padStart(2, '0')}/${year}`;
    let date = this.occupiedDates.find((d: any) => d.date == dateStr);
    if (date) {
      this.jourClicked = this.occupiedDates.filter(
        (d: any) => d.date == dateStr
      )[this.event];
      this.jourClickedSave = JSON.parse(JSON.stringify(this.jourClicked));
    } else {
      this.jourClicked = {
        date: dateStr,
        statut: 'demande',
        etape: 0,
        factures: [],
        devis: {},
        planning: {},
        essai: {},
        mariage: {},
      };
      this.jourClickedSave = JSON.parse(JSON.stringify(this.jourClicked));
    }
  }

  getEtape() {
    let etape = this.jourClicked.etape;
    if (etape == 0) {
      return 'Créer un devis';
    } else if (etape == 1) {
      return 'Facture arrhes';
    } else if (etape == 2) {
      return 'Facture finale';
    } else if (etape == 999) {
      return 'Evénement terminé';
    }
    return 'N/A';
  }
  clickEtape() {
    let etape = this.jourClicked.etape;
    if (etape == 0) {
      this.clickDevis();
    }
    if (etape == 1) {
      this.clickFacture();
    }
    if (etape == 2) {
      this.clickFacture();
    }
  }

  clickProchain() {
    const [d, m, y] = this.prochain.date.split('/').map(Number);
    this.clickJour(m-1, d, y);
  }

  changeJour(i: number) {
    const [day, month, year] = this.jourClicked.date.split('/').map(Number);
    let today = new Date(year, month - 1, day);
    if(i==1)
    {
      today.setDate(today.getDate() + 1);
      let prochain: any = this.occupiedDates
      .map(obj => ({
          ...obj,
          dateObj: new Date(obj.date.split('/').reverse().join('-')) // Convertit "dd/mm/aaaa" en "aaaa-mm-dd"
      }))
      .filter(obj => obj.dateObj > today); // Filtre les dates futures
      prochain = prochain.sort((a:any, b:any) => a.dateObj - b.dateObj);// Trie par date la plus proche
      if(prochain.length>0)
        {
          prochain = prochain[0];
          const [d, m, y] = prochain.date.split('/').map(Number);
          this.clickJour(m-1, d, y);
        }
    }
    else
    {
      today.setDate(today.getDate() - 1);
      let prochain: any = this.occupiedDates
      .map(obj => ({
          ...obj,
          dateObj: new Date(obj.date.split('/').reverse().join('-')) // Convertit "dd/mm/aaaa" en "aaaa-mm-dd"
      }))
      .filter(obj => obj.dateObj < today);
      prochain = prochain.sort((a:any, b:any) => a.dateObj - b.dateObj); // Trie par date la plus proche
      if(prochain.length>0)
      {
        prochain = prochain[prochain.length-1];
        const [d, m, y] = prochain.date.split('/').map(Number);
        this.clickJour(m-1, d, y);
      }
    }
  }

  changeEvent(i: any) {
    this.diffs = undefined;
    this.event += i;
    if (this.event >= this.otherEvents()) this.event = 0;
    else if (this.event < 0) this.event = this.otherEvents() - 1;
    this.jourClicked = this.occupiedDates.filter(
      (d: any) => d.date == this.jourClicked.date
    )[this.event];
    this.jourClickedSave = JSON.parse(JSON.stringify(this.jourClicked));
  }

  end() {
    this.jourClicked.etape = 999;
    this.save();
  }

  save() {
    if(this.safedev&&isDevMode())return;

    let exist = this.jourClicked.id;
    if (!exist) {
      this.occupiedDates.push(this.jourClicked);
    }

    const data: any = {
      factures: [],
      devis: {},
      planning: {},
      essai: {},
      mariage: {},
      etape: 0,
      date: this.jourClicked.date,
    };
    if (this.jourClicked.id) data.id = this.jourClicked.id;
    if (this.jourClicked.date) data.date = this.jourClicked.date;
    if (this.jourClicked.nom) data.nom = this.jourClicked.nom;
    if (this.jourClicked.statut) data.statut = this.jourClicked.statut;
    if (this.jourClicked.adresse) data.adresse = this.jourClicked.adresse;
    if (this.jourClicked.codepostal) data.codepostal = this.jourClicked.codepostal;
    if (this.jourClicked.mail) data.mail = this.jourClicked.mail;
    if (this.jourClicked.essai) data.essai = this.jourClicked.essai;
    if (this.jourClicked.mariage) data.mariage = this.jourClicked.mariage;
    if (this.jourClicked.mariagenet) data.mariagenet = this.jourClicked.mariagenet;
    if (this.jourClicked.tel) data.tel = this.jourClicked.tel;
    if (this.jourClicked.etape) data.etape = this.jourClicked.etape;
    if (this.jourClicked.devis) data.devis = this.jourClicked.devis;
    if (this.jourClicked.factures) data.factures = this.jourClicked.factures;
    if (this.jourClicked.planning) data.planning = this.jourClicked.planning;

    from(
      fetch(
        'http' +
          (isDevMode() ? '' : 's') +
          '://chiyanh.cluster031.hosting.ovh.net/cloeplanning' +
          (exist ? 'update' : 'create')+'.php?artiste='+this.artiste,
        {
          body: JSON.stringify(data),
          headers: {
            'Content-Type': 'application/json',
          },
          method: 'POST',
          mode: 'no-cors',
        }
      ).then((data: any) => {
        this.getData();
      })
    );

    this.jourClicked = undefined;
    this.search = '';
  }

  delete() {
    if(isDevMode())return;
    Swal.fire({
      title: 'Attention',
      text: 'Voulez vous vraiment supprimer ces données ?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Oui',
      cancelButtonText: 'Annuler',
    }).then((result): any => {
      if (result.isConfirmed) {
        let data = { id: this.jourClicked.id };
        from(
          fetch(
            'http' +
              (isDevMode() ? '' : 's') +
              '://chiyanh.cluster031.hosting.ovh.net/cloeplanningdelete.php?artiste='+this.artiste,
            {
              body: JSON.stringify(data),
              headers: {
                'Content-Type': 'application/json',
              },
              method: 'POST',
              mode: 'no-cors',
            }
          ).then((data: any) => {
            this.getData();
          })
        );

        this.jourClicked = undefined;
        this.search = '';
      }
    });
  /*
  1 : 3.93 k
  2 : 31.2 k
  3 : 266 k
  4 : 2.03 m
  5 : 20.3 m

  1 : 2.6 k
  2 : 22.5 k 
  3 : 191 k
  4 : 1.46 m
  5 : 14.6 m 
  */
  }

  formatNumber(num: number) {
    return String(num).padStart(3, '0');
  }

  checkMdp() {
    if (this.mdp == environment.password){
      this.okmdp = true;
      this.artiste = "cloe";
    }
    else if (this.mdp == environment.password2){
      this.okmdp = true;
      this.artiste = "celma";
      document.documentElement.style.setProperty('--fond', '#8dba8238');
      document.documentElement.style.setProperty('--principale', '#8bba82');
      document.documentElement.style.setProperty('--scroll', '#638e523b');
      document.documentElement.style.setProperty('--gris-shadow', '#505050');
      document.documentElement.style.setProperty('--required', '#578e52');
    }
    this.init();
  }
}
