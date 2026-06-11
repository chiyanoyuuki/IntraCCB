import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  Component,
  ElementRef,
  HostListener,
  inject,
  isDevMode,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterOutlet } from '@angular/router';
import { PDFDocumentProxy, getDocument } from 'pdfjs-dist';
import * as pdfjsLib from 'pdfjs-dist';
import { DevisComponent } from './devis/devis.component';
import { from } from 'rxjs';
import Swal from 'sweetalert2';
import { environment } from '../environments/environment';
import { DateService } from './services/date-service.service';
import { CalcService } from './services/calc-service.service';
import { Journee, Statut } from './models/models.model';

import { Chart } from 'chart.js';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, FormsModule, CommonModule, DevisComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  providers: [DatePipe],
})
export class AppComponent implements OnInit {
  private calcService = inject(CalcService);
  private dateService = inject(DateService);

  @ViewChild('devis') devis!: DevisComponent;
  @ViewChild('calendarContainer') calendarRef!: ElementRef;
  @ViewChildren('monthRef') monthRefs!: QueryList<ElementRef>;
  @ViewChild('chartCanvas', { static: true })
  chartCanvas!: ElementRef<HTMLCanvasElement>;
  chart!: Chart;
  mode: 'day' | 'month' = 'day';

  dataByYear: any = {}; // ton objet regroupé par année après graphs()

  baseapi = 'https://www.cloechaudronbeauty.com/backend/api/';

  safedev = false;

  currentMonth = new Date().getMonth() + 1;
  currentYear = new Date().getFullYear();
  years: any;
  monthLabels = Array.from({ length: 12 }, (_, i) => i + 1);
  colors = ['#ccc', 'rgb(135, 82, 142)', 'green', 'orange', 'purple'];

  width = 500;
  width2 = 600;
  height = 300;
  maxValue = 0;
  xStep = 0;
  xStep2 = 0;
  cumulativeByYear: any = {};
  cumulativeValues: number[] = [];
  cumulativeMax = 0;

  startchart = false;
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

  year = new Date().getFullYear();
  domaines: any;

  jourClicked: any = undefined;
  jourClickedSave: any = undefined;

  weekDays: string[] = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  occupiedDates: Journee[] = [];
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

  alldevis: any = [];
  allfactures: any = [];
  allplannings: any = [];
  allWedding: any = [];
  alldev: any = undefined;
  allfac: any = undefined;
  allwed: any = undefined;
  allrens: any = undefined;

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

  constructor(
    private http: HttpClient,
    private datePipe: DatePipe,
  ) {}

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
    if (!isDevMode()) {
      history.pushState(null, '', location.href);
      event.preventDefault();
      event.stopPropagation();
      this.onMobileReturn();
    }
  }

  onMobileReturn() {
    history.pushState(null, '', location.href);
    if (this.jourClicked.leavewhenreturn) {
      this.jourClicked = undefined;
    } else if (!this.jourClicked && this.portrait && this.month) {
      this.month = undefined;
      this.monthIndex = undefined;
    } else if (this.jourClicked && this.portrait && !this.jourClicked.mode)
      this.onRetour();
    else if (this.jourClicked && this.portrait && this.jourClicked.mode)
      this.jourClicked.mode = undefined;
    history.pushState(null, '', location.href);
  }

  ngOnInit() {
    this.innerHeight = window.innerHeight;
    this.innerWidth = window.innerWidth;

    if (window.innerHeight > window.innerWidth) this.portrait = true;
    else this.portrait = false;

    if (isDevMode()) {
      this.okmdp = true;
      this.init();
    }

    if (!isDevMode()) {
      window.addEventListener('beforeunload', (event: any) => {
        event.preventDefault();
        event.returnValue = '';
        this.onMobileReturn();
      });

      history.pushState(null, '', location.href);

      window.addEventListener('backbutton', (event) => {
        if (isDevMode()) return;
        history.pushState(null, '', location.href);
        event.preventDefault();
        event.stopPropagation();
        this.onMobileReturn();
      });
    }

    (pdfjsLib as any).GlobalWorkerOptions.workerSrc = 'pdf.worker.js';

    if (this.innerHeight > this.innerWidth) this.portrait = true;
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      const now = new Date();
      const currentMonthIndex = now.getMonth(); // 0 = Janvier

      const firstMonthEl = this.monthRefs.get(0)?.nativeElement;
      if (!firstMonthEl) return;

      const monthHeight = firstMonthEl.offsetHeight + 20;
      const rowIndex = Math.floor(currentMonthIndex / 2); // 2 colonnes → lignes

      const offset = rowIndex * monthHeight;

      this.calendarRef.nativeElement.scrollTo({
        top: offset,
        behavior: 'smooth',
      });
    }, 100);
  }

  onDevisRetour() {
    if (this.jourClicked.delete)
      this.jourClicked.factures.splice(this.jourClicked.delete, 1);
    if (this.portrait && !this.month) this.jourClicked = undefined;
    else this.jourClicked.mode = undefined;
    this.cancelViewport();
  }

  cancelViewport() {
    let int = setInterval(() => {
      const metaViewport = document.querySelector('meta[name=viewport]');
      if (metaViewport) {
        metaViewport.setAttribute(
          'content',
          `width=device-width, initial-scale=1`,
        );
      }
      window.scrollTo({ top: 0, left: 0 });
      document.documentElement.scrollIntoView();
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      clearInterval(int);
    }, 100);
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
    const subject = encodeURIComponent(
      'Disponibilité pour votre mariage du ' +
        this.formatDate(this.jourClicked.date),
    );
    const body = encodeURIComponent(
      'Bonjour ' +
        this.jourClicked.nom +
        ',\n\n' +
        'J’espère que vous allez bien.\n\n' +
        'Je me permets de revenir vers vous concernant votre mariage du ' +
        this.formatDate(this.jourClicked.date) +
        ' prochain.\n' +
        'N’ayant pas encore reçu de confirmation de votre part, je souhaitais savoir si vous souhaitiez toujours faire appel à mes services.\n\n' +
        'À noter que j’ai récemment reçu une autre demande pour cette même date.\n' +
        'Afin de pouvoir organiser mon planning au mieux, pourriez-vous me tenir informée de votre décision ?\n\n' +
        'N’hésitez pas à me contacter si vous avez la moindre question.\n\n' +
        'Au plaisir d’échanger avec vous,\n' +
        'Belle journée à vous. 🌞\n',
    );

    if (this.jourClicked.mail) {
      const mailtoLink = `mailto:${to}?subject=${subject}&body=${body}`;
      window.location.href = mailtoLink;
    } else if (
      this.jourClicked.mariagenet &&
      this.jourClicked.mariagenet != ''
    ) {
      navigator.clipboard.writeText(decodeURIComponent(body));
      window.open(
        'https://www.mariages.net/emp-AdminSolicitudesShow.php?id_solicitud=' +
          this.jourClicked.mariagenet,
        '_blank',
      );
    } else {
      navigator.clipboard.writeText(decodeURIComponent(body));
    }
  }

  sendEmails() {
    let mariees = this.occupiedDates.filter(
      (d: any) => d.statut == 'demande' && d.mail && d.mail != '',
    );
    mariees = mariees.map((m: any) => m.mail);

    const to = 'cloe.chaudron@outlook.com';
    const cc = [].join(',');
    const bcc = mariees.join(',');
    const subject = encodeURIComponent('Disponibilité pour votre mariage');
    const body = encodeURIComponent(
      'Bonjour Madame,\n\n' +
        'J’espère que vous allez bien.\n\n' +
        'Je me permets de revenir vers vous concernant votre mariage.\n' +
        'N’ayant pas encore reçu de confirmation de votre part, je souhaitais savoir si vous souhaitiez toujours faire appel à mes services.\n\n' +
        'À noter que j’ai récemment reçu une autre demande pour cette même date.\n' +
        'Afin de pouvoir organiser mon planning au mieux, pourriez-vous me tenir informée de votre décision ?\n\n' +
        'N’hésitez pas à me contacter si vous avez la moindre question.\n\n' +
        'Au plaisir d’échanger avec vous,\n' +
        'Belle journée à vous. 🌞\n',
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

  isAnt(mois: number, jour: number, year: number) {
    const dateDonnee = new Date(year, mois, jour);
    const aujourdHui = new Date();
    aujourdHui.setHours(0, 0, 0, 0);
    return dateDonnee < aujourdHui;
  }

  istoday(mois: number, jour: number, year: number) {
    const dateDonnee = new Date(year, mois, jour);
    const aujourdHui = new Date();
    aujourdHui.setHours(0, 0, 0, 0);
    return (
      dateDonnee.getDate() == aujourdHui.getDate() &&
      dateDonnee.getMonth() == aujourdHui.getMonth() &&
      dateDonnee.getFullYear() == aujourdHui.getFullYear()
    );
  }

  getData() {
    this.http.get<any[]>('domaines.json').subscribe((data: any) => {
      this.domaines = data;
    });

    if (this.safedev && isDevMode()) {
      this.http.get<any[]>('mockdata.json').subscribe((data: any) => {
        this.initData(data);
      });
    } else {
      this.http
        .get<any>(this.baseapi + 'cloeplanning.php?artiste=cloe')
        .subscribe((data) => {
          const filtered = data.filter((d: any) => d.statut !== 'essai');
          this.initData(filtered);
        });
    }
  }

  initData(data: any) {
    data = data.filter((data: any) => data.statut != 'essai');
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
          statut: Statut.Essai,
          date: d.essai.date,
          devis: {},
          factures: [],
          planning: {},
          essai: d.essai,
          etape: d.etape,
          mariage: d.mariage,
        };
        const [jour, mois, annee] = obj.date.split('/').map(Number);
        const dateDonnee = new Date(annee, mois - 1, jour);
        const aujourdHui = new Date();
        aujourdHui.setHours(0, 0, 0, 0);
        if (dateDonnee < aujourdHui) obj.etape = 999;
        this.occupiedDates.push(obj);
      });

    this.alldevis = this.occupiedDates.filter(
      (d: any) => d.devis && d.devis.creation,
    );

    this.allfactures = this.occupiedDates.filter(
      (d: any) => d.factures.length > 0,
    );

    this.allfactures = this.allfactures.flatMap((date: any) =>
      date.factures.map((facture: any) => ({
        ...date,
        facture: facture,
      })),
    );

    this.allWedding = this.occupiedDates.filter(
      (date: any) => date.statut != 'essai',
    );
    this.allWedding = this.allWedding.sort((a: any, b: any) => {
      let datea: any = new Date(a.date.split('/').reverse().join('-'));
      let dateb: any = new Date(b.date.split('/').reverse().join('-'));
      return datea - dateb;
    });

    let grouped2: any = {};
    this.occupiedDates.forEach((item) => {
      const [, month, year] = item.date.split('/'); // Extraire les parties de la date
      const key = `${month}-${year}`; // Clé sous forme "MM-YYYY"

      if (!grouped2[key]) {
        grouped2[key] = { mois: parseInt(month), annee: year, dates: [] };
      }
      grouped2[key].dates.push(item);
    });
    this.monthsvalues = Object.values(grouped2);

    const today = new Date();
    this.prochain = this.occupiedDates
      .map((obj) => ({
        ...obj,
        dateObj: new Date(obj.date.split('/').reverse().join('-')), // Convertit "dd/mm/aaaa" en "aaaa-mm-dd"
      }))
      .filter((obj) => obj.dateObj > today) // Filtre les dates futures
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())[0]; // Trie par date la plus proche

    this.graphs(); // prépare dataByYear
  }

  graphs() {
    const result: any = {};

    this.occupiedDates.forEach((client) => {
      client.factures.forEach((facture: any) => {
        const [, month, year] = facture.creation.split('/').map(Number);

        if (!result[year]) result[year] = {};
        if (!result[year][month]) result[year][month] = 0;

        result[year][month] += parseFloat('' + this.getFacSold(facture)); // cumul par mois
      });
    });

    this.dataByYear = result;

    delete this.dataByYear['2023'];

    this.years = Object.keys(this.dataByYear);
    this.maxValue = Math.max(
      ...this.years.flatMap((y: any) => Object.values(this.dataByYear[y])),
    );
    this.xStep = this.width / (this.monthLabels.length - 1);
    this.xStep2 = this.width2 / (this.monthLabels.length - 1);

    this.computeCumulativeByYear();
  }

  getMonthValue(year: string, month: number) {
    return this.dataByYear[year][month] || 0;
  }

  getLinePoints(year: string) {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // JS: 0 = janvier

    return this.monthLabels
      .filter((m) => !(+year === currentYear && m > currentMonth - 1)) // ignore les mois futurs pour l'année actuelle
      .map((m, i) => {
        const x = i * this.xStep;
        const y =
          this.height -
          (this.getMonthValue(year, m) / this.maxValue) * this.height;
        return `${x},${y}`;
      })
      .join(' ');
  }

  computeCumulativeByYear() {
    this.cumulativeByYear = {};
    this.cumulativeMax = 0;

    this.years.forEach((year: any) => {
      const cum: number[] = [];
      let sum = 0;
      for (let i = 0; i < 12; i++) {
        sum += this.getMonthValue(year, i + 1);
        cum.push(sum);
      }
      this.cumulativeByYear[year] = cum;
      this.cumulativeMax = Math.max(this.cumulativeMax, ...cum);
    });
  }

  getCumulativeValue(year: string, month: number) {
    return this.cumulativeByYear[year][month - 1] || 0;
  }

  getCumulativeLinePoints(year: string) {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // JS: 0 = janvier
    return this.monthLabels
      .filter((m) => !(+year === currentYear && m > currentMonth - 1))
      .map((_, i) => {
        const x = i * this.xStep;
        const y =
          this.height -
          (this.getCumulativeValue(year, i + 1) / this.cumulativeMax) *
            this.height;
        return `${x},${y}`;
      })
      .join(' ');
  }

  onDomainChange(event: any) {
    if (this.jourClicked.devis.prestas) {
      let deplac = this.jourClicked.devis.prestas.find((presta: any) =>
        presta.nom.includes('déplacement Jour-J'),
      );
      if (deplac) {
        deplac.qte = event.qte;
      } else {
        this.jourClicked.devis.prestas.push({
          en: 'D-Day Travel Expenses (Round Trip)',
          kilorly: true,
          nom: 'Frais de déplacement Jour-J (Aller/Retour)',
          prix: 0.4,
          qte: event.qte,
        });
      }
    } else {
      const now = new Date();
      let twoweeks = new Date();
      twoweeks = new Date(twoweeks.getTime() + 14 * 24 * 60 * 60 * 1000);
      let max: any = this.getMaxs();
      this.jourClicked.devis.annee = this.year;
      this.jourClicked.devis.creation =
        this.datePipe.transform(now, 'dd/MM/yyyy') || '';
      this.jourClicked.devis.echeance =
        this.datePipe.transform(twoweeks, 'dd/MM/yyyy') || '';
      this.jourClicked.devis.numero = max ? max.maxDevis + 1 : 1;
      this.jourClicked.devis.prestas = [
        {
          en: 'D-Day Travel Expenses (Round Trip)',
          kilorly: true,
          nom: 'Frais de déplacement Jour-J (Aller/Retour)',
          prix: 0.4,
          qte: event.qte,
        },
      ];
    }
  }

  calcPrestataires() {
    let total = 0;
    this.jourClicked.factures.forEach((facture: any) => {
      if (facture.paiementprestas)
        total = total + parseFloat('' + facture.paiementprestas);
    });
    if (total == 0) {
      if (
        this.jourClicked.planning &&
        this.jourClicked.planning.planningprestas
      ) {
        this.jourClicked.planning.planningprestas.forEach((presta: any) => {
          if (presta.presta != 0)
            total = total + parseInt(this.calcToString2(presta));
        });
      }
    }
    this.jourClicked.devis.prestas.forEach((presta: any) => {
      if (presta.nom.includes('renfort')) {
        let tot = this.calcToString(presta);
        if (tot == 'Offert') tot = '0';
        total += parseInt('' + tot);
      }
    });
    return parseInt('' + total);
  }

  renforts(i: any = -1) {
    let total: any = 0;

    let dates = this.occupiedDates.filter((date: any) => {
      const dateYear = parseInt(date.date.split('/')[2], 10);
      const dateMonth = parseInt(date.date.split('/')[1], 10);
      if (this.month)
        return (
          dateYear == this.year &&
          dateMonth == this.monthIndex + 1 &&
          date.statut != 'demande'
        );
      else return dateYear == this.year && date.statut != 'demande';
    });

    dates.forEach((d: any) => {
      let tot = 0;
      if (d.prestataires) tot += parseFloat(d.prestataires);
      else {
        d.factures
          .filter((facture: any) => facture.paiementprestas)
          .forEach(
            (facture: any) => (tot += parseFloat(facture.paiementprestas)),
          );
      }
      if (tot == 0) {
        if (d.planning && d.planning.planningprestas) {
          d.planning.planningprestas.forEach((presta: any) => {
            if (presta.presta != 0)
              tot = tot + parseInt(this.calcToString2(presta));
          });
        }
      }
      if (d.devis && d.devis.prestas) {
        d.devis.prestas.forEach((presta: any) => {
          if (presta.nom.includes('renfort'))
            tot += parseFloat(this.calc(presta));
        });
      }
      total += parseFloat('' + tot);
    });
    return parseInt(total) + '€';
  }

  calcTotMinusPrestas() {
    if (this.calcPrestataires() == 0) return parseInt(this.calcTot());
    let total = 0;
    this.jourClicked.factures.forEach((facture: any) => {
      if (facture.paiementprestas)
        total = total + parseFloat('' + facture.paiementprestas);
    });
    if (total == 0) {
      if (
        this.jourClicked.planning &&
        this.jourClicked.planning.planningprestas
      ) {
        this.jourClicked.planning.planningprestas.forEach((presta: any) => {
          if (presta.presta == 0)
            total = total + parseInt(this.calcToString2(presta));
        });
      }
    }
    this.jourClicked.devis.prestas.forEach((presta: any) => {
      if (
        !presta.nom.includes('renfort') &&
        presta.nom.includes('Frais de déplacement') &&
        presta.qte != '?'
      ) {
        let tot = this.calcToString(presta);
        if (tot == 'Offert') tot = '0';
        total += parseInt('' + tot);
      }
    });
    return parseInt('' + total);
  }

  getFullDate(dateStr: string) {
    const [day, month, year] = dateStr.split('/').map(Number);
    const date = new Date(year, month - 1, day); // Mois commence à 0 en JS

    // Formater la date en "Jeudi 12 avril"
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long', // Nom du jour en toutes lettres
      day: 'numeric', // Jour du mois
      month: 'long', // Nom du mois en toutes lettres
    })
      .format(date)
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  getallfactures() {
    let factures = this.allfactures.filter(
      (f: any) => f.facture.annee == this.year,
    );
    factures = factures.sort((a: any, b: any) => {
      return a.facture.numero - b.facture.numero;
    });
    return factures;
  }

  getallWed() {
    return this.allWedding.filter(
      (date: any) => date.date.split('/')[2] == this.year,
    );
  }

  getalldevis() {
    let devis = this.alldevis.filter((f: any) => f.devis.annee == this.year);
    devis = devis.sort((a: any, b: any) => {
      return a.devis.numero - b.devis.numero;
    });
    return devis;
  }

  otherEvents() {
    return this.occupiedDates.filter(
      (d: any) => d.date == this.jourClicked.date,
    ).length;
  }

  goToWed() {
    this.jourClicked = this.occupiedDates.find(
      (d: any) =>
        d.statut != 'essai' &&
        d.essai &&
        d.essai.date == this.jourClicked.date &&
        d.nom == this.jourClicked.nom,
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
          : true),
    );
    return this.getClass(date);
  }

  noPlanning(year: number, month: number, day: number): any {
    const dateStr = `${day.toString().padStart(2, '0')}/${(month + 1)
      .toString()
      .padStart(2, '0')}/${year}`;
    let date = this.occupiedDates.find(
      (d: any) =>
        d.date == dateStr &&
        (this.search != ''
          ? JSON.stringify(d).toLowerCase().includes(this.search.toLowerCase())
          : true),
    );
    return (
      date &&
      date.statut == 'reserve' &&
      date.etape != 999 &&
      !date.planning.date
    );
  }

  noEssai(year: number, month: number, day: number): any {
    const dateStr = `${day.toString().padStart(2, '0')}/${(month + 1)
      .toString()
      .padStart(2, '0')}/${year}`;
    let date = this.occupiedDates.find(
      (d: any) =>
        d.date == dateStr &&
        (this.search != ''
          ? JSON.stringify(d).toLowerCase().includes(this.search.toLowerCase())
          : true),
    );
    return (
      date && date.statut == 'reserve' && date.etape != 999 && !date.essai.date
    );
  }

  calcToString(presta: any) {
    if (presta.qte == '?') return '';
    let prix = this.calc(presta);
    if (prix == 0) return 'Offert';
    return prix + (prix < 100 ? ',00' : '') + '€';
  }

  calc(presta: any): any {
    if (presta.qte == '?') return 0;
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

  calcToString2(presta: any) {
    if (presta.qte == '?') return '';
    let prix = this.calc2(presta);
    if (prix == 0) return 'Offert';
    return prix + (prix < 100 ? ',00' : '') + '€';
  }

  calc2(presta: any): any {
    if (presta.qte == '?') return 0;
    let prix = presta.prix;
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
      if (f.solde) prix += this.getFacSold(f);
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

  calcPaye2(fac: any) {
    if (!this.jourClicked) return 0;
    let prix = 0;
    let f = this.jourClicked.factures[fac];
    if (f.solde) prix += this.getFacSold(f);
    else {
      f.prestas.forEach((presta: any) => {
        prix += this.calc(presta);
      });
    }
    return (
      parseInt('' + prix) +
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

  getClass(date: Journee | undefined): string {
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
        const [, , year] = obj.devis.creation.split('/').map(Number);
        return year === currentYear;
      })
      .map((obj: any) => obj.devis.numero);

    // 2️⃣ Récupérer tous les numéros des factures de cette année
    const factureNumbers = tableau
      .filter((d: any) => d.factures.length > 0)
      .flatMap((obj: any) => obj.factures) // 🔹 Regroupe toutes les factures
      .filter((facture: any) => {
        const [, , year] = facture.creation.split('/').map(Number);
        return year === currentYear;
      })
      .map((facture: any) => facture.numero);

    // 3️⃣ Trouver le max ou retourner `null` si aucun résultat
    const maxDevis = devisNumbers.length > 0 ? Math.max(...devisNumbers) : null;
    const maxFacture =
      factureNumbers.length > 0 ? Math.max(...factureNumbers) : null;

    return { maxDevis, maxFacture };
  }

  initDevis() {
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
    this.jourClicked.delete = undefined;
    if (i != undefined) {
      if (i.target) {
        this.jourClicked.factureClicked = i.target.value;
      } else {
        this.jourClicked.factureClicked = i;
      }
    } else {
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

  clickAllDevis(date: any) {
    if (this.alldev == undefined) return;
    this.jourClicked = this.occupiedDates.find(
      (d: any) => d.id == this.alldev.id,
    );
    this.jourClicked.download = true;
    this.jourClickedSave = JSON.parse(JSON.stringify(this.jourClicked));
    let int = setInterval(() => {
      this.clickDevis();
      clearInterval(int);
    }, 500);
  }

  clickAllWed(event: any) {
    let jour = this.allwed.date.split('/');
    this.clickJour(parseInt(jour[1]) - 1, parseInt(jour[0]), parseInt(jour[2]));
  }

  clickAllRens(event: any) {
    this.jourClicked = this.occupiedDates.find(
      (d: any) => d.id == this.allrens.id,
    );
    this.jourClicked.leavewhenreturn = true;
    this.jourClickedSave = JSON.parse(JSON.stringify(this.jourClicked));
    let int = setInterval(() => {
      this.openRenseignement();
      clearInterval(int);
    }, 10);
  }

  clickAllFactures(date: any) {
    if (this.allfac == undefined) return;
    this.jourClicked = this.occupiedDates.find(
      (d: any) => d.id == this.allfac.id,
    );
    this.jourClicked.download = true;
    this.jourClickedSave = JSON.parse(JSON.stringify(this.jourClicked));
    let factures = this.jourClicked.factures;
    let index = 0;
    if (factures.length > 1) {
      let facture = factures.find(
        (f: any) =>
          f.numero == this.allfac.facture.numero &&
          f.creation == this.allfac.facture.creation,
      );
      index = factures.indexOf(facture);
    }
    let int = setInterval(() => {
      this.clickFacture(index);
      clearInterval(int);
    }, 10);
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

  clickJour(mois: number, jour: number, year: number) {
    this.diffs = undefined;
    this.event = 0;
    this.hideTooltip();
    const dateStr = `${jour.toString().padStart(2, '0')}/${(mois + 1)
      .toString()
      .padStart(2, '0')}/${year}`;
    let date = this.occupiedDates.find((d: any) => d.date == dateStr);
    if (date) {
      this.jourClicked = this.occupiedDates.filter(
        (d: any) => d.date == dateStr,
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
    this.clickJour(m - 1, d, y);
  }

  changeJour(i: number) {
    const [day, month, year] = this.jourClicked.date.split('/').map(Number);
    let today = new Date(year, month - 1, day);
    if (i == 1) {
      today.setDate(today.getDate() + 1);
      let prochain: any = this.occupiedDates
        .map((obj) => ({
          ...obj,
          dateObj: new Date(obj.date.split('/').reverse().join('-')), // Convertit "dd/mm/aaaa" en "aaaa-mm-dd"
        }))
        .filter((obj) => obj.dateObj > today); // Filtre les dates futures
      prochain = prochain.sort((a: any, b: any) => a.dateObj - b.dateObj); // Trie par date la plus proche
      if (prochain.length > 0) {
        prochain = prochain[0];
        const [d, m, y] = prochain.date.split('/').map(Number);
        this.clickJour(m - 1, d, y);
      }
    } else {
      today.setDate(today.getDate() - 1);
      let prochain: any = this.occupiedDates
        .map((obj) => ({
          ...obj,
          dateObj: new Date(obj.date.split('/').reverse().join('-')), // Convertit "dd/mm/aaaa" en "aaaa-mm-dd"
        }))
        .filter((obj) => obj.dateObj < today);
      prochain = prochain.sort((a: any, b: any) => a.dateObj - b.dateObj); // Trie par date la plus proche
      if (prochain.length > 0) {
        prochain = prochain[prochain.length - 1];
        const [d, m, y] = prochain.date.split('/').map(Number);
        this.clickJour(m - 1, d, y);
      }
    }
  }

  changeEvent(i: any) {
    this.diffs = undefined;
    this.event += i;
    if (this.event >= this.otherEvents()) this.event = 0;
    else if (this.event < 0) this.event = this.otherEvents() - 1;
    this.jourClicked = this.occupiedDates.filter(
      (d: any) => d.date == this.jourClicked.date,
    )[this.event];
    this.jourClickedSave = JSON.parse(JSON.stringify(this.jourClicked));
  }

  end() {
    this.jourClicked.etape = 999;
    this.save();
  }

  getFacSold(f: any, i: any = 0) {
    let nb = f.solde ? f.solde : this.calcPaye2(i);
    if (f.realsold && parseFloat('' + f.realsold) != 0) {
      nb = parseFloat('' + f.realsold);
    }
    return nb;
  }

  save() {
    if (this.safedev && isDevMode()) {
      return;
    }
    if (this.jourClicked.statut == 'essai') return;

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
    if (this.jourClicked.codepostal)
      data.codepostal = this.jourClicked.codepostal;
    if (this.jourClicked.mail) data.mail = this.jourClicked.mail;
    if (this.jourClicked.essai) data.essai = this.jourClicked.essai;
    if (this.jourClicked.mariage) data.mariage = this.jourClicked.mariage;
    if (this.jourClicked.mariagenet)
      data.mariagenet = this.jourClicked.mariagenet;
    if (this.jourClicked.tel) data.tel = this.jourClicked.tel;
    if (this.jourClicked.etape) data.etape = this.jourClicked.etape;
    if (this.jourClicked.devis) data.devis = this.jourClicked.devis;
    if (this.jourClicked.factures) data.factures = this.jourClicked.factures;
    if (this.jourClicked.planning) data.planning = this.jourClicked.planning;
    if (this.jourClicked.avis) data.avis = this.jourClicked.avis;

    from(
      fetch(
        this.baseapi +
          'cloeplanning' +
          (exist ? 'update' : 'create') +
          '.php?artiste=cloe',
        {
          body: JSON.stringify(data),
          headers: {
            'Content-Type': 'application/json',
          },
          method: 'POST',
          mode: 'no-cors',
        },
      ).then((data: any) => {
        this.getData();
      }),
    );

    this.jourClicked = undefined;
    this.search = '';
  }

  delete() {
    if (isDevMode()) return;
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
            this.baseapi + 'cloeplanningdelete.php?artiste=cloe',
            {
              body: JSON.stringify(data),
              headers: {
                'Content-Type': 'application/json',
              },
              method: 'POST',
              mode: 'no-cors',
            },
          ).then((data: any) => {
            this.getData();
          }),
        );

        this.jourClicked = undefined;
        this.search = '';
      }
    });
  }

  formatNumber(num: number) {
    return String(num).padStart(3, '0');
  }

  checkMdp() {
    if (this.mdp == environment.password) {
      this.okmdp = true;
    }
    this.init();
  }

  //NEW METHODS =======================================

  getStatut2(statut: string) {
    return this.dateService.getNbStatut(
      this.occupiedDates,
      statut,
      this.year,
      this.monthIndex,
    );
  }
  getEtape2(etape: number) {
    return this.dateService.getNbEtape(
      this.occupiedDates,
      etape,
      this.year,
      this.monthIndex,
    );
  }
  getHoursWorked(fromNow: boolean, untilNow: boolean) {
    const perHour = this.calcService.getPerHour(
      this.occupiedDates,
      this.year,
      fromNow,
      untilNow,
      this.monthIndex,
    );
    const time = this.calcService.getHoursWorked(
      this.occupiedDates,
      this.year,
      fromNow,
      untilNow,
      this.monthIndex,
    );
    if (untilNow)
      return (
        "Tu as travaillé <span class='glow'>" +
        parseInt('' + time / 60) +
        "</span> heures et <span class='glow'>" +
        (time % 60) +
        '</span> minutes (' +
        perHour +
        '€/h)'
      );
    if (fromNow)
      return (
        "Il te reste environ <span class='glow'>" +
        parseInt('' + time / 60) +
        "</span> heures et <span class='glow'>" +
        (time % 60) +
        '</span> minutes (' +
        perHour +
        '€/h)'
      );
    else
      return (
        'Ton ' +
        (this.monthIndex ? 'mois' : 'année') +
        " est de <span class='glow'>" +
        parseInt('' + time / 60) +
        "</span> heures et <span class='glow'>" +
        (time % 60) +
        '</span> minutes (' +
        perHour +
        '€/h)'
      );
  }
  getAlreadyPaid() {
    return this.calcService.getAlreadyPaid(
      this.occupiedDates,
      this.year,
      this.monthIndex,
    );
  }
  getNotPaid() {
    return this.calcService.getNotPaid(
      this.occupiedDates,
      this.year,
      this.monthIndex,
    );
  }
  getHelpers() {
    return this.calcService.getHelpers(
      this.occupiedDates,
      this.year,
      this.monthIndex,
    );
  }
  getEstimate() {
    let total = this.calcService.getEstimate(
      this.occupiedDates,
      this.year,
      this.monthIndex,
    );
    return (
      'Estimation ' +
      (this.monthIndex ? 'mensuelle' : 'annuelle') +
      " : <span class='glow'>" +
      total +
      '€ (' +
      parseInt('' + (total - total * 0.24)) +
      '€ net)</span>'
    );
  }
  getTotal() {
    let total = this.calcService.getTotal(
      this.occupiedDates,
      this.year,
      this.monthIndex,
    );
    return (
      'Total ' +
      (this.monthIndex ? 'mensuel' : 'annuel') +
      " : <span class='glow'>" +
      total +
      '€ (' +
      parseInt('' + (total - total * 0.24)) +
      '€ net)</span>'
    );
  }
  getMonthFactures2() {
    return this.dateService.getMonthFactures(
      this.occupiedDates,
      this.monthIndex,
      this.year,
    );
  }
  getMonthFacturesMissing() {
    return this.calcService.getMonthFacturesMissing(
      this.occupiedDates,
      this.monthIndex,
      this.year,
    );
  }

  onDayClicked(dateStr: string, id: string = '') {
    this.event = 0;
    this.diffs = undefined;
    this.hideTooltip();

    let events = this.dateService.getDaysThisDay(
      this.occupiedDates,
      dateStr,
      id,
    );
    if (events.length == 0) {
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
    } else {
      this.jourClicked = events[0];
    }
    this.jourClickedSave = JSON.parse(JSON.stringify(this.jourClicked));
  }
}
