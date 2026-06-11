import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { jsPDF } from 'jspdf';
import { CommonModule, DatePipe } from '@angular/common';
import html2canvas from 'html2canvas';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { ReadpdfService } from '../../services/readpdf.service';

/** Champs du formulaire devis / facture / planning (remplace l'ancien tableau values[]) */
interface DevisForm {
  // Devis — en-tête
  devisDate: string;
  devisNumero: any;
  devisAnnee: string;
  // Émetteur (Cloé)
  emetteurNom: string;
  emetteurAdresse: string;
  emetteurCp: string;
  emetteurTel: string;
  emetteurMail: string;
  // Client
  clientNom: string;
  clientAdresse: string;
  clientCp: string;
  clientTel: string;
  clientMail: string;
  // Devis — pied
  devisEcheance: string;
  datePrestation: string;
  acompte: any;
  modePaiement: string;
  // Planning
  planningTitre: string;
  planningDate: string;
  lieuDomaine: string;
  lieuAdresse: string;
  lieuCp: string;
  // Facture
  factureNumero: any;
  factureAnnee: string;
  factureDate: string;
  factureEcheance: string;
  factureSolde: any;
  paiementPrestas: any;
  factureNote: string;
  factureRealsold: any;
}

@Component({
  selector: 'app-devis',
  standalone: true,
  imports: [RouterOutlet, FormsModule, CommonModule],
  templateUrl: './devis.component.html',
  styleUrl: './devis.component.scss',
  providers: [DatePipe],
})
export class DevisComponent implements OnInit {
  @Output() retour = new EventEmitter<string>();

  @Input() data: any;

  informations: any;
  values: DevisForm = {
    devisDate: '',
    devisNumero: '',
    devisAnnee: '',
    emetteurNom: '',
    emetteurAdresse: '',
    emetteurCp: '',
    emetteurTel: '',
    emetteurMail: '',
    clientNom: '',
    clientAdresse: '',
    clientCp: '',
    clientTel: '',
    clientMail: '',
    devisEcheance: '',
    datePrestation: '',
    acompte: '',
    modePaiement: '',
    planningTitre: '',
    planningDate: '',
    lieuDomaine: '',
    lieuAdresse: '',
    lieuCp: '',
    factureNumero: '',
    factureAnnee: '',
    factureDate: '',
    factureEcheance: '',
    factureSolde: '',
    paiementPrestas: '',
    factureNote: '',
    factureRealsold: '',
  };
  dataprestas: any = [];
  prestas: any = [];
  baseprestas: any;

  modedevis = 'Mariage';

  typeinvitee = [
    { fr: 'Invitée', en: 'Guest' },
    { fr: 'Mariée', en: 'Bride' },
  ];
  ceremonie: any = '';
  finprestas: any = '';
  isacquitee = false;

  collegues = [
    [
      'Cloé',
      'CHAUDRON',
      '+33 6 68 64 44 02',
      'cloe.chaudron@outlook.com',
      '',
      '',
      '',
    ],
    [
      'Celma',
      'SAHIDET',
      '+33 6 80 84 42 52',
      'sahidetcelma@gmail.com',
      '',
      '',
      '',
    ],
  ];

  invitees: any = [
    [
      0,
      '8h30',
      '8h45',
      '9h00',
      '9h00',
      '10h15',
      '15h30 à 16h00',
      "jusqu'à 16h00",
      '16h00',
      0,
    ],
  ];

  planningtop = [
    { fr: 'ARRIVEE', en: 'ARRIVAL' },
    { fr: 'INSTALLATION', en: 'SETUP' },
    { fr: 'MAQUILLAGE', en: 'MAKEUP' },
    { fr: 'COIFFURE', en: 'HAIRSTYLING' },
    { fr: 'FIN PRESTATION', en: 'END OF SERVICE' },
    { fr: 'RETOUCHES', en: 'TOUCH-UPS' },
    { fr: 'DISPONIBILITE', en: 'AVAILABILITY' },
    { fr: 'CEREMONIE', en: 'CEREMONY' },
  ];

  lg = 'Français';

  planningprestas: any;

  intitules: any = [];
  renfort = false;

  popupVisible = false;
  inputValue = '';
  inviteeEdit: any;

  mode = 'devis';
  public innerWidth: any = window.innerWidth;
  public innerHeight: any = window.innerHeight;
  paysage = true;
  inited = false;

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.innerHeight = event.target.innerHeight;
    this.innerWidth = event.target.innerWidth;

    if (event.target.innerHeight > event.target.innerWidth)
      this.paysage = false;
    else this.paysage = true;
  }

  constructor(
    private datePipe: DatePipe,
    private http: HttpClient,
    private readPDF: ReadpdfService,
  ) {}

  getBasePrestas(): Observable<any[]> {
    return this.http.get<any[]>(
      'https://www.cloechaudronbeauty.com/backend/api/getintraccbdata.php',
    );
  }

  ngOnInit() {
    this.getBasePrestas().subscribe((data) => {
      this.baseprestas = data;
      this.baseprestas.forEach((presta: any) => {
        presta.qte = 0;
      });
      this.prestas = JSON.parse(JSON.stringify(this.baseprestas));
      if (this.innerHeight > this.innerWidth) this.paysage = false;
      else this.paysage = true;
    });
  }

  popupRename(invitee: any) {
    this.inviteeEdit = invitee;
    this.inputValue = invitee[11]; // pré-remplir
    this.popupVisible = true;
  }

  cancel() {
    this.popupVisible = false;
  }

  validate() {
    this.inviteeEdit[11] = this.inputValue;
    this.popupVisible = false;
  }

  onCeremonieInput() {
    if (!this.ceremonie || this.ceremonie == '') {
      this.invitees.forEach((i: any) => (i[8] = ''));
    } else if (this.ceremonie.match(/^[0-9]{1,2}h[0-9]{2}$/g)) {
      this.invitees.forEach((i: any) => (i[8] = this.ceremonie));
      this.changeForCeremonie();
    }
  }

  onFinPrestasInput() {
    if (this.finprestas.match(/^[0-9]{1,2}h[0-9]{2}$/g)) {
      this.changeForCeremonie();
    }
  }

  changeForCeremonie() {
    for (let c = 0; c < this.collegues.length; c++) {
      if (this.collegues[c][4] == '') {
        let temps = this.ceremonie;
        let tempstot = -60;
        if (this.finprestas.match(/^[0-9]{1,2}h[0-9]{2}$/g)) {
          tempstot = 0;
          temps = this.finprestas;
        }

        let prestas = this.getplanningprestas(c);

        if (prestas.length > 0) {
          prestas.forEach((p: any) => (tempstot -= p.time));

          temps = this.addMinutesToTime(temps, tempstot);

          let inv = this.invitees.find((i: any) => i[9] == c);
          let presta = this.planningprestas.find(
            (p: any) => p.index == inv[10],
          );

          if (presta.maquillage) inv[3] = temps;
          else inv[3] = '';
          if (presta.coiffure) inv[4] = temps;
          else inv[4] = '';
        }
      } else {
        let inv = this.invitees.find((i: any) => i[9] == c);
        let presta = this.planningprestas.find((p: any) => p.index == inv[10]);

        if (presta.maquillage)
          inv[3] = this.addMinutesToTime(this.collegues[c][4], 30);
        else inv[3] = '';
        if (presta.coiffure)
          inv[4] = this.addMinutesToTime(this.collegues[c][4], 30);
        else inv[4] = '';
      }
    }
    if (
      this.collegues[0][4] == '' &&
      this.collegues[1][4] == '' &&
      this.getplanningprestas(0).length > 0 &&
      this.getplanningprestas(1).length > 0
    )
      this.adaptStart();
    else this.actualiser();
  }

  onArriveeInput(i: any) {
    let value: any = this.collegues[i][4];
    if (value.match(/^[0-9]{1,2}h[0-9]{2}$/g)) {
      this.changeForCeremonie();
    } else if (value == '') {
      if (this.ceremonie != '') this.onCeremonieInput();
      else if (this.finprestas != '') this.onFinPrestasInput();
      this.invitees.forEach((inv: any) => (inv[6] = ''));
    }
  }

  onRetoucheInput(i: any) {
    let value: any = this.collegues[i][5];
    if (value.match(/^[0-9]{1,2}h[0-9]{2}$/g)) {
      this.invitees
        .filter((inv: any) => inv[9] == i)
        .forEach((inv: any) => (inv[6] = value));
    } else if (value == '') {
      this.invitees
        .filter((inv: any) => inv[9] == i)
        .forEach((inv: any) => (inv[6] = ''));
      if (this.ceremonie != '') this.onCeremonieInput();
      else if (this.finprestas != '') this.onFinPrestasInput();
    }
  }

  onDispoInput(i: any) {
    let value: any = this.collegues[i][6];
    if (value.match(/^[0-9]{1,2}h[0-9]{2}$/g)) {
      this.invitees
        .filter((inv: any) => inv[9] == i)
        .forEach((inv: any) => (inv[7] = value));
    } else if (value == '') {
      this.invitees
        .filter((inv: any) => inv[9] == i)
        .forEach((inv: any) => (inv[7] = ''));
    }
  }

  adaptStart() {
    if (this.invitees.filter((i: any) => i[9] == 1).length > 0) {
      let firstInv0 = this.invitees.find((i: any) => i[9] == 0);
      let firstInv1 = this.invitees.find((i: any) => i[9] == 1);

      let debut1 = firstInv0[3];
      if (debut1 == '') debut1 = firstInv0[4];
      let debut2 = firstInv1[3];
      if (debut2 == '') debut2 = firstInv1[4];

      if (debut1 != debut2) {
        let ecart = this.differenceMinutes(debut1, debut2);
        if (this.estPlusTot(debut1, debut2)) {
          let newhour = this.addMinutesToTime(debut2, -ecart);
          if (firstInv1[3] != '') firstInv1[3] = newhour;
          if (firstInv1[4] != '') firstInv1[4] = newhour;
        } else {
          let newhour = this.addMinutesToTime(debut1, -ecart);
          if (firstInv0[3] != '') firstInv0[3] = newhour;
          if (firstInv0[4] != '') firstInv0[4] = newhour;
        }
        this.actualiser();
        this.adaptRetouches();
      }
    } else {
      this.actualiser();
    }
  }

  adaptRetouches() {
    let firstInv0 = this.invitees.filter((i: any) => i[9] == 0);
    firstInv0 = firstInv0[firstInv0.length - 1];
    let firstInv1 = this.invitees.filter((i: any) => i[9] == 1);
    firstInv1 = firstInv1[firstInv1.length - 1];

    let debut1 = firstInv0[5];
    let debut2 = firstInv1[5];

    if (this.estPlusTot(debut1, debut2)) {
      this.invitees
        .filter((i: any) => i[9] == 0)
        .forEach((i: any) => (i[6] = debut2));
      this.invitees
        .filter((i: any) => i[9] == 1)
        .forEach((i: any) => (i[6] = ''));
    } else {
      this.invitees
        .filter((i: any) => i[9] == 1)
        .forEach((i: any) => (i[6] = debut1));
      this.invitees
        .filter((i: any) => i[9] == 0)
        .forEach((i: any) => (i[6] = ''));
    }
  }

  estPlusTot(heure1: string, heure2: string): boolean {
    const [h1, m1] = heure1.split('h').map(Number);
    const [h2, m2] = heure2.split('h').map(Number);

    const totalMinutes1 = h1 * 60 + m1;
    const totalMinutes2 = h2 * 60 + m2;

    return totalMinutes1 < totalMinutes2;
  }

  differenceMinutes(heure1: string, heure2: string): number {
    const [h1, m1] = heure1.split('h').map(Number);
    const [h2, m2] = heure2.split('h').map(Number);

    const totalMinutes1 = h1 * 60 + m1;
    const totalMinutes2 = h2 * 60 + m2;

    return Math.abs(totalMinutes2 - totalMinutes1);
  }

  onInput(value: any, setyear: any = false): string {
    value = value.replace(/\D/g, '');
    if (value.length > 2) value = value.slice(0, 2) + '/' + value.slice(2);
    if (value.length > 5) value = value.slice(0, 5) + '/' + value.slice(5);

    if (setyear) {
      if (value.length > 3) {
        this.values.devisAnnee = value.substring(value.length - 4);
        this.values.factureAnnee = value.substring(value.length - 4);
      }
    }

    if (value.length == 10 && this.mode == 'devis') {
      const [day, month, year] = value.split('/').map(Number);
      const date = new Date(year, month - 1, day); // Mois commence à 0 en JS

      // Ajouter 14 jours
      date.setDate(date.getDate() + 14);

      // Reformater en "dd/mm/yyyy"
      const newDay = String(date.getDate()).padStart(2, '0');
      const newMonth = String(date.getMonth() + 1).padStart(2, '0'); // Mois commence à 0
      const newYear = date.getFullYear();

      this.values.devisEcheance = newDay + '/' + newMonth + '/' + newYear;
    }

    return value;
  }

  monter(idx: any, presta: any) {
    let prestas = this.getplanningprestas(presta.presta);

    let p1 = prestas[idx - 1];
    let p2 = prestas[idx];

    let i1 = this.invitees.find((i: any) => i[10] == p1.index);
    let i2 = this.invitees.find((i: any) => i[10] == p2.index);

    if (i1[1] != '') {
      let arrivee = i1[1];
      let installation = this.addMinutesToTime(arrivee, 10);
      let debut = this.addMinutesToTime(arrivee, 20);

      i1[1] = '';
      i1[2] = '';

      i2[1] = arrivee;
      i2[2] = installation;
      if (i2[3] != '') i2[3] = debut;
      if (i2[4] != '') i2[4] = debut;
    }

    let idxi1 = this.invitees.indexOf(i1);
    let idxi2 = this.invitees.indexOf(i2);
    let idxp1 = this.planningprestas.indexOf(p1);
    let idxp2 = this.planningprestas.indexOf(p2);

    this.planningprestas[idxp1] = JSON.parse(JSON.stringify(p2));
    this.planningprestas[idxp2] = JSON.parse(JSON.stringify(p1));

    this.invitees[idxi1] = JSON.parse(JSON.stringify(i2));
    this.invitees[idxi2] = JSON.parse(JSON.stringify(i1));

    this.actualiser();
  }

  descendre(idx: any, presta: any) {
    let prestas = this.getplanningprestas(presta.presta);

    let p1 = prestas[idx];
    let p2 = prestas[idx + 1];

    let i1 = this.invitees.find((i: any) => i[10] == p1.index);
    let i2 = this.invitees.find((i: any) => i[10] == p2.index);

    if (i1[1] != '') {
      let arrivee = i1[1];
      let installation = this.addMinutesToTime(arrivee, 10);
      let debut = this.addMinutesToTime(arrivee, 20);

      i1[1] = '';
      i1[2] = '';

      i2[1] = arrivee;
      i2[2] = installation;
      if (i2[3] != '') i2[3] = debut;
      if (i2[4] != '') i2[4] = debut;
    }

    let idxi1 = this.invitees.indexOf(i1);
    let idxi2 = this.invitees.indexOf(i2);
    let idxp1 = this.planningprestas.indexOf(p1);
    let idxp2 = this.planningprestas.indexOf(p2);

    this.planningprestas[idxp1] = JSON.parse(JSON.stringify(p2));
    this.planningprestas[idxp2] = JSON.parse(JSON.stringify(p1));

    this.invitees[idxi1] = JSON.parse(JSON.stringify(i2));
    this.invitees[idxi2] = JSON.parse(JSON.stringify(i1));

    this.actualiser();
  }

  deleteAll() {
    this.prestas.forEach((p: any) => (p.qte = 0));
  }

  init(maxs: any = undefined) {
    let data = JSON.parse(JSON.stringify(this.data));
    this.inited = false;
    this.prestas = JSON.parse(JSON.stringify(this.baseprestas));

    this.invitees = [];
    this.intitules = [];
    this.collegues = [this.collegues[0], this.collegues[1]];

    const now = new Date();
    let twoweeks = new Date();
    twoweeks = new Date(twoweeks.getTime() + 14 * 24 * 60 * 60 * 1000);
    let sixmonth = new Date();
    sixmonth = new Date(sixmonth.getTime() + 30 * 24 * 6 * 60 * 60 * 1000);
    this.values.devisDate = this.datePipe.transform(now, 'dd/MM/yyyy') || '';
    this.values.devisNumero = maxs ? maxs.maxDevis + 1 : '1';
    this.values.devisAnnee = this.datePipe.transform(now, 'yyyy') || '';
    this.values.emetteurNom = 'Cloé Chaudron';
    this.values.emetteurAdresse = '126 Rue de la Cerisaie';
    this.values.emetteurCp = '84400 Gargas';
    this.values.emetteurTel = '+33 6 68 64 44 02';
    this.values.emetteurMail = 'cloe.chaudron@outlook.com';
    this.values.devisEcheance = this.datePipe.transform(twoweeks, 'dd/MM/yyyy') || '';
    this.values.datePrestation = this.datePipe.transform(sixmonth, 'dd/MM/yyyy') || '';
    this.values.acompte = '';
    this.values.modePaiement = 'Virement';
    this.values.planningTitre = 'PLANNING';
    this.values.planningDate = data.date;
    this.values.lieuDomaine = '';
    this.values.lieuAdresse = '';
    this.values.lieuCp = '';
    this.values.factureNumero = maxs ? maxs.maxFacture + 1 : '1';
    this.values.factureAnnee = this.datePipe.transform(now, 'yyyy') || '';
    this.values.factureDate = this.datePipe.transform(now, 'dd/MM/yyyy') || '';
    this.values.factureEcheance = this.datePipe.transform(twoweeks, 'dd/MM/yyyy') || '';
    this.values.factureSolde = '';
    this.values.paiementPrestas = 0;
    this.values.factureNote = '';

    this.values.factureRealsold = '';

    this.mode = data.mode;

    this.values.clientNom = data.nom;
    this.values.clientAdresse = data.adresse;
    this.values.clientCp = data.codepostal;
    this.values.clientTel = data.tel;
    this.values.clientMail = data.mail;
    this.values.datePrestation = data.date;

    if (data.mode == 'devis' && data.devis) {
      if (data.devis.prestas) {
        data.devis.prestas.forEach((p: any) => {
          let presta = this.prestas.find(
            (pres: any) => p.nom.includes(pres.nom) && !pres.titre,
          );
          if (presta) {
            presta.qte = p.qte;
            presta.prix = p.prix;
            presta.reduc = p.reduc ? p.reduc : 0;
            presta.nom = p.nom;
          } else {
            this.prestas.push({
              qte: p.qte,
              nom: p.nom,
              prix: p.prix,
              reduc: p.reduc ? p.reduc : 0,
              kilorly: p.kilorly,
            });
          }
        });
      }

      if (data.devis.creation) this.values.devisDate = data.devis.creation;
      if (data.devis.numero) this.values.devisNumero = data.devis.numero;
      if (data.devis.annee) this.values.devisAnnee = data.devis.annee;
      if (data.devis.echeance) this.values.devisEcheance = data.devis.echeance;
    } else if (data.mode == 'planning' && !data.planning.date) {
      this.values.lieuDomaine = data.mariage.domaine;
      this.values.lieuAdresse = data.mariage.adresse;
      this.values.lieuCp = data.mariage.codepostal;
      this.ceremonie = data.mariage.ceremonie;
      this.planningprestas = [];
      let mariee: any;
      let prestas = data.devis.prestas;
      if (prestas) {
        prestas.forEach((p: any) => {
          let presta = this.prestas.find((pres: any) => pres.nom == p.nom);
          if (presta && presta.time) {
            p.coiffure = presta.coiffure;
            p.maquillage = presta.maquillage;
            p.time = presta.time;

            for (let i = 0; i < p.qte; i++) {
              let press = JSON.parse(JSON.stringify(p));
              press.presta = 0;
              press.index = this.planningprestas.length;
              if (press.bride) mariee = JSON.parse(JSON.stringify(press));
              else {
                this.planningprestas.push(press);
                this.addInvitee(press);
              }
            }
          }
        });
      }
      if (mariee) {
        mariee.index = this.planningprestas.length;
        this.planningprestas.push(mariee);
        this.addInvitee(mariee);
      }
    } else if (data.mode == 'planning' && data.planning.date) {
      this.collegues = data.planning.collegues;
      this.invitees = data.planning.invitees;
      this.values.planningDate = data.planning.date;
      this.values.lieuDomaine = data.planning.domaine;
      this.values.lieuAdresse = data.planning.adresse;
      this.values.lieuCp = data.planning.codepostal;
      this.planningprestas = data.planning.planningprestas;
      this.ceremonie = data.mariage.ceremonie;
      this.finprestas = data.planning.finprestas;
    } else if (data.mode == 'facture') {
      if (data.factureClicked != -1) {
        let facture = data.factures[data.factureClicked];

        if (facture.prestas) {
          facture.prestas.forEach((p: any) => {
            let presta = this.prestas.find(
              (pres: any) => p.nom.includes(pres.nom) && !pres.titre,
            );
            if (presta) {
              presta.qte = p.qte;
              presta.prix = p.prix;
              presta.reduc = p.reduc ? p.reduc : 0;
              presta.nom = p.nom;
            } else {
              this.prestas.push({
                qte: p.qte,
                nom: p.nom,
                prix: p.prix,
                reduc: p.reduc ? p.reduc : 0,
              });
            }
          });
        }

        if (facture.type) this.values.modePaiement = facture.type;
        if (facture.creation) this.values.factureDate = facture.creation;
        if (facture.numero) this.values.factureNumero = facture.numero;
        if (facture.annee) this.values.factureAnnee = facture.annee;
        if (facture.solde) this.values.factureSolde = facture.solde;
        if (facture.realsold) this.values.factureRealsold = facture.realsold;
        if (facture.paiementprestas) this.values.paiementPrestas = facture.paiementprestas;

        if (data.factures.length > 0) {
          let prix = 0;
          for (let i = 0; i < data.factureClicked; i++) {
            if (i != data.factureClicked) {
              let f = data.factures[i];
              if (f.solde) prix += this.getFacSold(f);
              else {
                f.prestas.forEach((p: any) => {
                  prix += this.calc(p);
                });
              }
            }
          }
          this.values.acompte = prix;
        }
      } else if (data.factures.length == 0) {
        this.prestas.push({
          qte: 1,
          nom: 'Paiement Arrhes',
          prix: this.calcaresFromDevis(),
          reduc: 0,
        });
      } else if (data.factures.length > 0) {
        data.devis.prestas.forEach((p: any) => {
          let presta = this.prestas.find(
            (pres: any) => p.nom.includes(pres.nom) && !pres.titre,
          );
          if (presta) {
            presta.qte = p.qte;
            presta.prix = p.prix;
            presta.reduc = p.reduc ? p.reduc : 0;
            presta.nom = p.nom;
          } else {
            this.prestas.push({
              qte: p.qte,
              nom: p.nom,
              prix: p.prix,
              reduc: p.reduc ? p.reduc : 0,
            });
          }
        });
        let prix = 0;
        data.factures.forEach((f: any) => {
          if (f.solde) prix += this.getFacSold(f);
          else {
            f.prestas.forEach((p: any) => {
              prix += this.calc(p);
            });
          }

          f.prestas.forEach((p: any) => {
            let prest = this.prestas.find(
              (pres: any) =>
                pres.nom == p.nom && pres.prix == p.prix && pres.qte == p.qte,
            );
            if (prest) prest.qte = 0;
          });
        });
        this.values.acompte = prix;

        if (
          !data.factures.find(
            (f: any) => f.paiementprestas && f.paiementprestas != 0,
          )
        ) {
          if (data.planning && data.planning.planningprestas) {
            let tot = 0;
            data.planning.planningprestas.forEach((presta: any) => {
              if (presta.presta != 0) tot = tot + parseFloat('' + presta.prix);
            });
            this.values.paiementPrestas = parseInt('' + tot);
          }
          if (data.devis && data.devis.prestas) {
            data.devis.prestas.forEach((presta: any) => {
              if (presta.nom.includes('renfort'))
                this.values.paiementPrestas += this.calc(presta);
            });
          }
          this.values.factureSolde =
            parseInt(this.transform(this.calcTot(true))) - this.values.paiementPrestas;
          this.values.factureRealsold = 0;
        }
      }
    } else if (data.mode == 'renseignement') {
      this.informations = JSON.parse(JSON.stringify(this.data));
      if (
        this.informations &&
        this.informations.devis &&
        this.informations.devis.prestas
      ) {
        this.informations.devis.prestas.forEach((p: any) => {
          let presta = this.prestas.find((presta: any) => presta.nom == p.nom);
          if (presta) {
            p.maquillage = presta.maquillage;
            p.coiffure = presta.coiffure;
          }
        });
      }

      this.informations.complet = this.getNbPrestasInvitee(true, true);
      this.informations.maquillage = this.getNbPrestasInvitee(true, false);
      this.informations.coiffure = this.getNbPrestasInvitee(false, true);

      this.informations.collegues = [];
      this.informations.texte = ['', '', '', '', ''];
      if (
        this.informations.planning &&
        this.informations.planning.planningprestas
      ) {
        this.planningprestas = this.data.planning.planningprestas;
        if (this.getplanningprestas(1).length > 0)
          this.informations.collegues.push(this.collegues[1]);
        if (this.getplanningprestas(2).length > 0)
          this.informations.collegues.push(this.collegues[2]);
        if (this.getplanningprestas(3).length > 0)
          this.informations.collegues.push(this.collegues[3]);
      } else if (
        this.informations &&
        this.informations.devis &&
        this.informations.devis.prestas
      ) {
        if (
          this.informations.devis.prestas.find((p: any) =>
            p.nom.includes('renfort'),
          )
        )
          this.informations.collegues.push(this.collegues[1]);
      }
    }

    this.inited = true;
    if (this.data.download) {
      let int = setInterval(() => {
        this.generatePDFfromHTML();
        this.data.download = undefined;
        this.return();
        clearInterval(int);
      }, 10);
    }

    if (!this.paysage) {
      this.adjustViewport();
    }
  }

  textWithNbsp(texte: any) {
    return '&nbsp;' + texte.replace(/ /g, '&nbsp;');
  }

  getHeureArrivee() {
    if (!this.informations.planning || !this.informations.planning.invitees)
      return '';
    return this.informations.planning.invitees.find(
      (p: any) => p[9] == 0 && p[1] != '',
    )[1];
  }

  getFinPrestas() {
    if (!this.informations.planning || !this.informations.planning.invitees)
      return '';
    let invitees = this.informations.planning.invitees.filter(
      (p: any) => p[9] == 0,
    );
    return invitees[invitees.length - 1][5];
  }

  getNbPrestasInvitee(maquillage: boolean, coiffure: boolean) {
    if (!this.informations.devis || !this.informations.devis.prestas) return '';
    let cpt = 0;
    this.informations.devis.prestas.forEach((p: any) => {
      if (!p.bride) {
        if (!p.maquillage && !maquillage) {
          if (!p.coiffure && !coiffure) {
            cpt += p.qte;
          } else if (p.coiffure && coiffure) {
            cpt += p.qte;
          }
        } else if (p.maquillage && maquillage) {
          if (!p.coiffure && !coiffure) {
            cpt += p.qte;
          } else if (p.coiffure && coiffure) {
            cpt += p.qte;
          }
        }
      }
    });
    return parseInt('' + cpt) > 0 ? parseInt('' + cpt) : '';
  }

  generateRange(n: number): number[] {
    return new Array(n).fill(0).map((_, index) => index);
  }

  adjustViewport() {
    let int = setInterval(() => {
      const screenWidth = window.innerWidth;
      const contentWidth = document.getElementById('htmlContent')!.offsetWidth;

      const scale = screenWidth / contentWidth;

      const metaViewport = document.querySelector('meta[name=viewport]');
      if (metaViewport) {
        metaViewport.setAttribute(
          'content',
          `width=device-width, initial-scale=${scale}`,
        );
      }
      window.scrollTo({ top: 0, left: 0 });
      document.documentElement.scrollIntoView();
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      clearInterval(int);
    }, 100);
  }

  cancelViewport() {
    const metaViewport = document.querySelector('meta[name=viewport]');
    if (metaViewport) {
      metaViewport.setAttribute(
        'content',
        `width=device-width, initial-scale=1`,
      );
    }
  }

  changePrestataire(event: any, presta: any) {
    let artiste = event.target.value;

    let index = presta.index;
    let invitee = this.invitees.find((i: any) => i[10] == index);
    let invindex = this.invitees.indexOf(invitee);

    let invartiste = this.invitees.filter((i: any) => i[9] == invitee[9]);
    let indexartiste = invartiste.indexOf(invitee);
    if (invartiste.length > 1 && indexartiste == 0) {
      invartiste[1][1] = invitee[1];
      invartiste[1][2] = invitee[2];
    }

    this.invitees.splice(invindex, 1);
    this.addInvitee(presta, artiste);
  }

  onCheckBoxClick(type: any, presta: any) {
    if (!presta.maquillage && !presta.coiffure) {
      if (type == 'm') presta.coiffure = true;
      else presta.maquillage = true;
    } else {
      if (presta.maquillage && presta.coiffure) presta.time = presta.time * 2;
      else presta.time = presta.time / 2;
    }

    let invitee = this.invitees.find((i: any) => i[10] == presta.index);

    let debut = invitee[3];
    if (debut == '') debut = invitee[4];

    if (presta.maquillage) invitee[3] = debut;
    else invitee[3] = '';

    if (presta.coiffure) invitee[4] = debut;
    else invitee[4] = '';

    if (this.ceremonie != '' || this.finprestas != '') {
      this.onCeremonieInput();
    } else {
      this.actualiser();
    }
  }

  onTimeInput(presta: any) {
    if (presta.time.match(/^[0-9]+$/)) {
      presta.time = parseInt(presta.time);
      if (this.ceremonie != '' || this.finprestas != '') {
        this.onCeremonieInput();
      } else {
        this.actualiser();
      }
    }
  }

  deletePresta(presta: any) {
    let indexpresta = this.planningprestas.indexOf(presta);
    let inv = this.invitees.find((i: any) => i[10] == presta.index);
    let indexinv = this.invitees.indexOf(inv);

    this.planningprestas.splice(indexpresta, 1);
    this.invitees.splice(indexinv, 1);

    if (this.ceremonie != '' || this.finprestas != '') {
      this.onCeremonieInput();
    } else {
      this.actualiser();
    }
  }

  addPlanningPresta(i: any) {
    let presta = JSON.parse(JSON.stringify(this.getplanningprestas(i)[0]));
    presta.index = this.planningprestas.length;
    presta.nom = '';
    presta.time = 45;
    this.planningprestas.push(presta);
    this.addInvitee(presta, i);
  }

  getplanningprestas(i: number) {
    return this.planningprestas.filter((p: any) => p.presta == i);
  }

  addPrestas() {
    let arrhes = this.prestas.find((p: any) => p.nom == 'Paiement Arrhes');
    if (arrhes) arrhes.qte = 0;
    this.data.devis.prestas.forEach((p: any) => {
      let presta = this.prestas.find(
        (pres: any) => p.nom.includes(pres.nom) && !pres.titre,
      );
      if (presta) {
        presta.qte = p.qte;
        presta.prix = p.prix;
        presta.reduc = p.reduc ? p.reduc : 0;
        presta.nom = p.nom;
      } else {
        let presta: any = {
          qte: p.qte,
          nom: p.nom,
          prix: p.prix,
          reduc: p.reduc ? p.reduc : 0,
        };
        if (p.nom.includes('Frais de déplacement')) presta.kilorly = true;
        this.prestas.push(presta);
      }
    });
    let prix = 0;
    this.data.factures.forEach((f: any) => {
      if (f.solde) prix += this.getFacSold(f);
      else {
        f.prestas.forEach((p: any) => {
          prix += this.calc(p);
        });
      }

      f.prestas.forEach((p: any) => {
        let prest = this.prestas.find(
          (pres: any) =>
            pres.nom == p.nom && pres.prix == p.prix && pres.qte == p.qte,
        );
        if (prest) prest.qte = 0;
      });
    });
    this.values.acompte = prix;
  }

  async onFileSelected(event: Event) {
    let tmp: any = await this.readPDF.onFileSelected(event);
    if (tmp.date) this.values.devisDate = tmp.date;
    if (tmp.devis) this.values.devisNumero = tmp.devis;
    if (tmp.annee) this.values.devisAnnee = tmp.annee;
    if (tmp.nom) this.values.clientNom = tmp.nom;
    if (tmp.adresse) this.values.clientAdresse = tmp.adresse;
    if (tmp.codepostal) this.values.clientCp = tmp.codepostal;
    if (tmp.tel) this.values.clientTel = tmp.tel;
    if (tmp.mail) this.values.clientMail = tmp.mail;
    if (tmp.echeance) this.values.devisEcheance = tmp.echeance;
    if (tmp.prestas) {
      tmp.prestas.forEach((p: any) => {
        let presta = this.prestas.find((pres: any) => pres.nom == p.nom);
        if (presta) {
          presta.qte = p.qte;
          presta.prix = p.prix;
          presta.reduc = p.reduc ? p.reduc : 0;
        } else {
          this.prestas.push({
            qte: p.qte,
            nom: p.nom,
            prix: p.prix,
            reduc: p.reduc ? p.reduc : 0,
          });
        }
      });
    }
  }

  getDateArrhes() {
    if (this.data.factures[0]) {
      return '(' + this.data.factures[0].creation + ')';
    }
    return '';
  }

  return() {
    this.retour.emit();
  }

  delete() {
    this.data.delete = this.data.factureClicked;
    this.retour.emit();
  }

  save() {
    if (this.mode == 'devis') {
      let devis: any = {};
      devis.prestas = this.prestas.filter(
        (p: any) => p.qte > 0 || p.qte == '?',
      );
      devis.creation = this.values.devisDate;
      devis.numero = this.values.devisNumero;
      devis.annee = this.values.devisAnnee;
      devis.echeance = this.values.devisEcheance;
      this.data.devis = devis;
      if (this.data.etape == 0) this.data.etape = 1;
    } else if (this.mode == 'facture') {
      let facture: any = {};
      facture.prestas = this.prestas.filter(
        (p: any) => p.qte > 0 || p.qte == '?',
      );
      facture.type = this.values.modePaiement;
      facture.creation = this.values.factureDate;
      facture.numero = this.values.factureNumero;
      facture.annee = this.values.factureAnnee;
      facture.paiementprestas = this.values.paiementPrestas;
      facture.solde = this.calcTot(true);
      if (this.values.factureSolde) facture.solde = this.values.factureSolde;
      if (this.values.factureRealsold) facture.realsold = this.values.factureRealsold;
      if (this.data.factures.length == 0) {
        this.data.etape = 2;
        if (this.data.statut == 'demande') this.data.statut = 'reserve';
      }
      if (this.data.factureClicked == -1) this.data.factures.push(facture);
      else this.data.factures[this.data.factureClicked] = facture;
    } else if (this.mode == 'planning') {
      let planning: any = {};
      planning.date = this.values.planningDate;
      planning.domaine = this.values.lieuDomaine;
      planning.adresse = this.values.lieuAdresse;
      planning.codepostal = this.values.lieuCp;
      planning.invitees = this.invitees;
      planning.collegues = this.collegues;
      planning.planningprestas = this.planningprestas;
      planning.ceremonie = this.ceremonie;
      planning.finprestas = this.finprestas;
      if (!this.data.mariage.ceremonie)
        this.data.mariage.ceremonie = this.ceremonie;
      this.data.planning = planning;
    }

    if (this.values.clientNom != '') this.data.nom = this.values.clientNom;
    if (this.values.clientAdresse != '') this.data.adresse = this.values.clientAdresse;
    if (this.values.clientCp != '') this.data.codepostal = this.values.clientCp;
    if (this.values.clientTel != '') this.data.tel = this.values.clientTel;
    if (this.values.clientMail != '') this.data.mail = this.values.clientMail;

    this.retour.emit();
  }

  checkRow(row: number, col: number, c: number): number {
    let tab = this.getInvitees(c);

    const value = tab[row][col];
    let count = 1;

    for (let i = row + 1; i < tab.length; i++) {
      if (value != '' && tab[i][col] === value) {
        count++;
      } else {
        break;
      }
    }

    return count;
  }

  actualiser() {
    for (let i = 0; i < this.collegues.length; i++) {
      let invitees = this.invitees.filter((inv: any) => inv[9] == i);
      for (let j = 0; j < invitees.length; j++) {
        let invitee = invitees[j];
        let presta = this.planningprestas.find(
          (p: any) => p.index == invitee[10],
        );
        if (j == 0) {
          let debut = '';
          if (presta.maquillage) debut = invitee[3];
          else if (presta.coiffure) debut = invitee[4];

          let arrivee = this.addMinutesToTime(debut, -20);
          let installation = this.addMinutesToTime(debut, -10);

          invitee[1] = arrivee;
          invitee[2] = installation;
          invitee[5] = this.addMinutesToTime(debut, presta.time);
        } else {
          let debut = invitees[j - 1][5];

          invitee[3] = presta.maquillage ? debut : '';
          invitee[4] = presta.coiffure ? debut : '';
          invitee[5] = this.addMinutesToTime(debut, presta.time);
        }
      }
    }

    let tab: any = [];
    this.invitees.forEach((i: any) => {
      tab.push(
        JSON.parse(
          JSON.stringify(
            this.planningprestas.find((p: any) => i[10] == p.index),
          ),
        ),
      );
    });
    this.planningprestas = tab;
  }

  getFacSold(f: any, i: any = 0) {
    let nb = f.solde ? f.solde : 0;
    if (f.realsold && parseFloat('' + f.realsold) != 0) {
      nb = parseFloat('' + f.realsold);
    }
    return nb;
  }

  addInvitee(presta: any, artiste: any = 0) {
    let invitees = this.invitees.filter((i: any) => i[9] == artiste);
    if (invitees.length == 0) {
      let arrivee =
        this.collegues[artiste][4] != '' ? this.collegues[artiste][4] : '8h30';
      let installation = this.addMinutesToTime(arrivee, 10);
      let debut = this.addMinutesToTime(arrivee, 20);

      this.invitees.push([
        presta.bride ? 1 : 0,
        arrivee,
        installation,
        presta.maquillage ? debut : '',
        presta.coiffure ? debut : '',
        this.addMinutesToTime(debut, presta.time),
        this.collegues[artiste][5] != '' ? this.collegues[artiste][5] : '',
        this.collegues[artiste][6] != '' ? this.collegues[artiste][6] : '',
        this.ceremonie != '' ? this.ceremonie : '',
        artiste,
        presta.index,
      ]);
    } else {
      this.invitees.push([
        presta.bride ? 1 : 0,
        '',
        '',
        presta.maquillage ? invitees[invitees.length - 1][5] : '',
        presta.coiffure ? invitees[invitees.length - 1][5] : '',
        this.addMinutesToTime(invitees[invitees.length - 1][5], presta.time),
        this.collegues[artiste][5] != '' ? this.collegues[artiste][5] : '',
        this.collegues[artiste][6] != '' ? this.collegues[artiste][6] : '',
        this.ceremonie != '' ? this.ceremonie : '',
        artiste,
        presta.index,
      ]);
    }
    if (this.ceremonie != '' || this.finprestas != '') {
      this.onCeremonieInput();
    } else {
      this.actualiser();
    }
  }

  getInvitees(c: any) {
    return this.invitees.filter((i: any) => i[9] == c);
  }

  trackByIndex(index: number, item: any): number {
    return index;
  }

  getNbInvitee(c: number, i: number, t: any) {
    let tab = this.getInvitees(c);
    let count = 1;
    for (let x = 0; x < i; x++) {
      if (tab[x][0] == t) count++;
    }
    return count;
  }

  getRealSold() {
    return this.values.factureSolde != ''
      ? this.values.factureSolde - this.values.factureRealsold
      : parseFloat(this.transform(this.calcTot(true))) - this.values.factureRealsold;
  }

  addMinutesToTime(timeStr: string, minutesToAdd: number): string {
    // Extraire l'heure et les minutes depuis le format "HHhMM"
    let [hours, minutes] = timeStr.split('h').map(Number);

    // Créer un objet Date avec l'heure et les minutes
    let date = new Date();
    date.setHours(hours);
    date.setMinutes(minutes + minutesToAdd);

    // Récupérer la nouvelle heure et minutes
    let newHours = date.getHours();
    let newMinutes = date.getMinutes();

    let retour =
      newHours + 'h' + (newMinutes < 10 ? '0' + newMinutes : newMinutes);

    // Formater en "HHhMM" (ajout d'un zéro si besoin)
    return retour;
  }

  deleteCollegue(i: any) {
    this.collegues.splice(i, 1);
  }

  checkCol(row: number, col: number, c: number): number {
    let tab = this.getInvitees(c);

    const value = tab[row][col];
    let count = 1;

    for (let i = col + 1; i < tab[row].length; i++) {
      if (value != '' && tab[row][i] === value) {
        count++;
      } else {
        break;
      }
    }

    return count;
  }

  checkDisplay(row: number, col: number, c: number) {
    let tab = this.getInvitees(c);

    const value = tab[row][col];
    if (value != '' && tab[row][col - 1] === value) return true;
    if (row > 0 && value != '' && tab[row - 1][col] === value) return true;
    else return false;
  }

  generatePDFfromHTML() {
    if (!this.paysage) {
      this.cancelViewport();
    }

    const element = document.getElementById('htmlContent');

    html2canvas(element!, { scale: 4 }).then((canvas) => {
      const imgData = canvas.toDataURL('image/jpeg');
      const pdf = new jsPDF('p', 'mm', 'a4');

      const imgWidth = 210; // Largeur en mm pour A4
      const pageHeight = 297; // Hauteur pour A4
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      let nom = 'DEVIS_';
      if (this.mode == 'facture') nom = 'FACTURE_';
      if (this.mode == 'planning') {
        nom = 'PLANNING_' + this.values.planningDate;
      } else if (this.mode == 'renseignement') {
        nom =
          'RENSEIGNEMENT_' +
          this.informations.nom.toUpperCase().replace(/ +/g, '_');
      } else {
        let value = this.values.devisNumero;
        let annee = this.values.devisAnnee;
        if (this.mode == 'facture') {
          value = this.values.factureNumero;
          annee = this.values.factureAnnee;
        }
        if (value < 100) nom = nom + '0';
        if (value < 10) nom = nom + '0';
        nom = nom + value;
        nom = nom + '_' + annee;
      }

      pdf.save(nom + '.pdf');
      //this.trackVisit();
    });
    if (!this.paysage) {
      this.adjustViewport();
    }
  }
  addQte(presta: any) {
    presta.qte = parseInt(presta.qte) + 1;
  }

  addCollegue() {
    this.collegues.push(['', '', '', '', '', '', '']);
  }

  getCollegues() {
    let retour = [];
    for (let i = 0; i < this.collegues.length; i++) {
      if (this.getInvitees(i).length > 0) retour.push(this.collegues[i]);
    }
    return retour;
  }

  addPresta() {
    this.prestas.push({ nom: '', qte: 0, prix: 50, reduc: '' });
  }

  calc(presta: any) {
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
    this.prestas
      .filter((presta: any) => presta.qte > 0)
      .forEach((presta: any) => {
        prix += this.calc(presta);
      });
    if (calcDeja && this.values.acompte != '') prix = prix - this.values.acompte;
    return prix;
  }

  calcares() {
    let prix = 0;
    this.prestas
      .filter((presta: any) => presta.bride && presta.qte > 0)
      .forEach((presta: any) => {
        prix += this.calc(presta);
      });
    if (prix != 0) prix = 0.3 * prix;
    else prix = 0.3 * this.calcTot();
    return Math.floor(prix);
  }
  calcaresFromDevis() {
    let prix = 0;
    let prestas = this.data.devis.prestas;
    prestas
      .filter((presta: any) => presta.bride && presta.qte > 0)
      .forEach((presta: any) => {
        prix += this.calc(presta);
      });
    if (prix != 0) prix = 0.3 * prix;
    return Math.floor(prix);
  }

  transform(value: any): string {
    if (typeof value === 'string') {
      value = value.replace(/[^0-9\.,]/g, '');
      value = parseFloat(value);
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

  formatDate(dateStr: any) {
    const [day, month, year] = dateStr.split('/'); // Sépare le format dd/mm/yyyy
    return this.lg === 'Anglais' ? `${month}/${day}/${year}` : dateStr;
  }

  reinitPlanning() {
    this.data.planning.date = undefined;
    this.init();
  }

  calcGains(i: any) {
    let tmp = this.getplanningprestas(i);
    let somme = 0;
    tmp.forEach((t: any) => {
      let prix = parseInt('' + t.prix);
      if (t.reduc) prix = prix - (prix * t.reduc) / 100;
      prix = parseInt('' + prix);
      somme += prix;
    });

    this.data.devis.prestas.forEach((presta: any) => {
      if (i != 0 && presta.nom.includes('renfort') && presta.qte != '?') {
        let tot = this.calcToString(presta);
        somme += parseInt('' + tot);
      } else if (
        i == 0 &&
        presta.nom.includes('Frais de déplacement') &&
        !presta.nom.includes('renfort') &&
        presta.qte != '?'
      ) {
        let tot = this.calcToString(presta);
        if (tot == 'Offert') tot = '0';
        somme += parseInt('' + tot);
      }
    });

    return this.transform(somme) + '€';
  }

  calcToString(presta: any) {
    if (presta.qte == '?') return '';
    let prix = this.calcx(presta);
    if (prix == 0) return 'Offert';
    return prix + (prix < 100 ? ',00' : '') + '€';
  }

  calcx(presta: any): any {
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

}
