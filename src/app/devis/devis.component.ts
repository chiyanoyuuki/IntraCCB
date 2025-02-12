import { Component, EventEmitter, HostListener, Input, isDevMode, OnInit, Output, SimpleChanges } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { jsPDF } from 'jspdf';
import { CommonModule, DatePipe } from '@angular/common';
import html2canvas from 'html2canvas';
import { FormsModule } from '@angular/forms';
import { from } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { ReadpdfService } from '../../services/readpdf.service';

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

  values: any = [];
  dataprestas: any = [];
  prestas: any = [];
  baseprestas: any = [
    {
      nom: 'Frais de déplacement Jour-J (Aller/Retour)',
      en: 'D-Day Travel Expenses (Round Trip)',
      prix: 0.4,
      kilorly: true,
    },
    {
      nom: 'Frais de déplacement Essai (Aller/Retour)',
      en: 'Trial Travel Expenses (Round Trip)',
      prix: 0.4,
      kilorly: true,
    },
    {
      nom: 'Frais de déplacement renfort (Aller/Retour)',
      en: 'Backup Travel Expenses (Round Trip)',
      prix: 0.4,
      kilorly: true,
    },
    {
      nom: 'Mariée (essai et jour-J)',
      en: 'Bride (Trial and D-Day)',
      titre: true,
    },
    {
      nom: 'Forfait Mariée Complet',
      en: 'Complete Bride Package',
      prix: 420,
      onlyOne: true,
      bride: true,
      time:120,
      maquillage:true,
      coiffure:true
    },
    {
      nom: 'Maquillage Mariée',
      en: 'Bride Makeup',
      prix: 220,
      onlyOne: true,
      bride: true,
      time:60,
      maquillage:true
    },
    {
      nom: 'Coiffure Mariée',
      en: 'Bride Hairstyling',
      prix: 220,
      onlyOne: true,
      bride: true,
      time:60,
      coiffure:true
    },
    {
      nom: 'Maquillage et coiffure supplémentaire (Mariage civil, seconde mise en beauté)',
      en: 'Additional Makeup and Hairstyling (Civil Wedding, Second Beauty Touch-Up)',
      prix: 300,
      bride: true,
      time:120,
      maquillage:true,
      coiffure:true
    },
    {
      nom: 'Invitée (jour-J)',
      en: 'Guest (D-Day)',
      titre: true,
    },
    {
      nom: 'Forfait Invitée Complet',
      en: 'Complete Guest Package',
      prix: 130,
      time:75,
      maquillage:true,
      coiffure:true
    },
    {
      nom: 'Coiffure Invitée (Attache complète)',
      en: 'Guest Hairstyling (Full Updo)',
      prix: 80,
      time:45,
      coiffure:true
    },
    {
      nom: 'Coiffure Invitée (Attache partielle)',
      en: 'Guest Hairstyling (Partial Updo)',
      prix: 70,
      time:45,
      coiffure:true
    },
    {
      nom: 'Brushing Hollywoodien Invitée',
      en: 'Hollywood Blowout (Guest)',
      prix: 70,
      time:45,
      coiffure:true
    },
    {
      nom: 'Maquillage Invitée',
      en: 'Guest Makeup',
      prix: 65,
      time:45,
      maquillage:true
    },
    {
      nom: 'Coiffure enfant (-13ans)',
      en: 'Child Hairstyling (-13 years)',
      prix: 30,
      time:20,
      coiffure:true
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
    },
    {
      nom: 'Pose Faux-cils (bouquets)',
      en: 'False Lashes Application (Clusters)',
      prix: 0,
    },
    {
      nom: 'Maquillage Marié',
      en: 'Groom Makeup',
      prix: 30,
      onlyOne: true,
      time:30,
      maquillage:true
    },
    {
      nom: 'Présence avant 7h',
      en: 'Early Presence (Before 7 AM)',
      prix: 30,
      onlyOne: true,
    },
    {
      nom: 'Suivi Mariée',
      en: 'Bride Follow-Up',
      prix: 50,
      hourly: true,
    },
  ];

  typeinvitee = ["Invitée","Mariée"];
  ceremonie: any = "";
  finprestas: any = "";

  collegues = [
    ["Cloé","CHAUDRON","06.68.64.44.02","cloe.chaudron@outlook.com","","",""],
    ["Celma","SAHIDET","06.80.84.42.52","sahidetcelma@gmail.com","","",""]
  ]

  invitees:any = [[0,"8h30","8h45","9h00","9h00","10h15","15h30 à 16h00","jusqu'à 16h00","16h00",0]];

  planningtop = [{
    fr:"ARRIVEE"
  },{
    fr:"INSTALLATION"
  },{fr:"MAQUILLAGE"},{fr:"COIFFURE"},{fr:"FIN PRESTATION"},{fr:"RETOUCHES"},{fr:"DISPONIBILITE"},{fr:"CEREMONIE"}
  ];

  lg = 'Français';

  planningprestas: any;

  intitules : any = [];
  renfort = false;

  mode = 'devis';
  public innerWidth: any = window.innerWidth;
  public innerHeight: any = window.innerHeight;
  paysage = true;
  inited=false;

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.innerHeight = event.target.innerHeight;
    this.innerWidth = event.target.innerWidth;

    if (event.target.innerHeight > event.target.innerWidth)
      this.paysage = false;
    else this.paysage = true;
  }

  constructor(private datePipe: DatePipe, private http: HttpClient, private readPDF : ReadpdfService) {
    
  }

  ngOnInit() {
    
    this.baseprestas.forEach((presta: any) => {
      presta.qte = 0;
    });
    this.prestas = JSON.parse(JSON.stringify(this.baseprestas));
    if (this.innerHeight > this.innerWidth) this.paysage = false;
    else this.paysage = true;
  }

  onCeremonieInput()
  {
    if(this.ceremonie.match(/^[0-9]{2}h[0-9]{2}$/g))
    {
      this.invitees.forEach((i:any)=>i[8]=this.ceremonie);
      this.changeForCeremonie();
    }
  }

  onFinPrestasInput()
  {
    if(this.finprestas.match(/^[0-9]{2}h[0-9]{2}$/g))
    {
      this.changeForCeremonie();
    }
  }

  changeForCeremonie()
  {
    for(let c=0;c<this.collegues.length;c++)
      {
        let temps = this.ceremonie;
        let tempstot = -60;
        if(this.finprestas.match(/^[0-9]{2}h[0-9]{2}$/g)) 
        {
          tempstot = 0;
          temps = this.finprestas;
        }

        let prestas = this.getplanningprestas(c);

        if(prestas.length>0)
        {
          prestas.forEach((p:any)=>tempstot-=p.time);

          temps = this.addMinutesToTime(temps,tempstot);

          let inv = this.invitees.find((i:any)=>i[9]==c);

          if(inv[3]!="")inv[3]=temps;
          if(inv[4]!="")inv[4]=temps;
        }
      }
      this.adaptStart();
  }

  adaptStart()
  {
    if(this.invitees.filter((i:any)=>i[9]==1).length>0)
    {
      let firstInv0 = this.invitees.find((i:any)=>i[9]==0);
      let firstInv1 = this.invitees.find((i:any)=>i[9]==1);

      let debut1 = firstInv0[3];
      if(debut1=="") debut1 = firstInv0[4];
      let debut2 = firstInv1[3];
      if(debut2=="") debut2 = firstInv1[4];

      if(debut1!=debut2)
      {
        let ecart = this.differenceMinutes(debut1,debut2);
        if(this.estPlusTot(debut1,debut2))
        {
          let newhour = this.addMinutesToTime(debut2,-ecart);
          if(firstInv1[3]!="")firstInv1[3] = newhour;
          if(firstInv1[4]!="")firstInv1[4] = newhour;
        }
        else
        {
          let newhour = this.addMinutesToTime(debut1,-ecart);
          if(firstInv0[3]!="")firstInv0[3] = newhour;
          if(firstInv0[4]!="")firstInv0[4] = newhour;
        }
        this.actualiser();
        this.adaptRetouches();
      }
    }
    else{this.actualiser();}
  } 

  adaptRetouches()
  {
      let firstInv0 = this.invitees.filter((i:any)=>i[9]==0);
      firstInv0 = firstInv0[firstInv0.length-1];
      let firstInv1 = this.invitees.filter((i:any)=>i[9]==1);
      firstInv1 = firstInv1[firstInv1.length-1];

      let debut1 = firstInv0[5];
      let debut2 = firstInv1[5];

      if(this.estPlusTot(debut1,debut2))
      {
        this.invitees.filter((i:any)=>i[9]==0).forEach((i:any)=>i[6]=debut2);
        this.invitees.filter((i:any)=>i[9]==1).forEach((i:any)=>i[6]="");
      }
      else
      {
        this.invitees.filter((i:any)=>i[9]==1).forEach((i:any)=>i[6]=debut1);
        this.invitees.filter((i:any)=>i[9]==0).forEach((i:any)=>i[6]="");
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

  onInput(value:any, setyear:any=false): void {
    value = value.replace(/\D/g, '');
    if (value.length > 2) value = value.slice(0, 2) + '/' + value.slice(2);
    if (value.length > 5) value = value.slice(0, 5) + '/' + value.slice(5);

    if(setyear)
    {
      if(value.length>3)
      {
        this.values[2] = value.substring(value.length-4);
        this.values[56] = value.substring(value.length-4);
      }
    }

    if(value.length==10&&this.mode=='devis')
    {
      const [day, month, year] = value.split('/').map(Number);
      const date = new Date(year, month - 1, day); // Mois commence à 0 en JS

      // Ajouter 14 jours
      date.setDate(date.getDate() + 14);

      // Reformater en "dd/mm/yyyy"
      const newDay = String(date.getDate()).padStart(2, '0');
      const newMonth = String(date.getMonth() + 1).padStart(2, '0'); // Mois commence à 0
      const newYear = date.getFullYear();

      this.values[13]=newDay+"/"+newMonth+"/"+newYear;
    }

    return value;
  }

  monter(idx:any, presta:any)
  {
    let prestas = this.getplanningprestas(presta.presta);

    let p1 = prestas[idx-1];
    let p2 = prestas[idx];

    let i1 = this.invitees.find((i:any)=>i[10]==p1.index);
    let i2 = this.invitees.find((i:any)=>i[10]==p2.index);

    if(i1[1]!="")
      {
        let arrivee = i1[1];
        let installation = this.addMinutesToTime(arrivee,15);
        let debut = this.addMinutesToTime(arrivee,30);
  
        i1[1]="";
        i1[2]="";
  
        i2[1]=arrivee;
        i2[2]=installation;
        if(i2[3]!="")i2[3]=debut;
        if(i2[4]!="")i2[4]=debut;
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

  descendre(idx:any, presta:any)
  {
    let prestas = this.getplanningprestas(presta.presta);

    let p1 = prestas[idx];
    let p2 = prestas[idx+1];

    let i1 = this.invitees.find((i:any)=>i[10]==p1.index);
    let i2 = this.invitees.find((i:any)=>i[10]==p2.index);

    if(i1[1]!="")
      {
        let arrivee = i1[1];
        let installation = this.addMinutesToTime(arrivee,15);
        let debut = this.addMinutesToTime(arrivee,30);
  
        i1[1]="";
        i1[2]="";
  
        i2[1]=arrivee;
        i2[2]=installation;
        if(i2[3]!="")i2[3]=debut;
        if(i2[4]!="")i2[4]=debut;
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

  getInvIndex(x:any)
  {
    let invitee = this.invitees.find((i:any)=>i[10]==x);
    return this.invitees.indexOf(invitee);
  }


  deleteAll()
  {
    this.prestas.forEach((p:any)=>p.qte=0);
  }


  init(maxs:any = undefined)
  {
    this.inited=false;
    this.prestas = JSON.parse(JSON.stringify(this.baseprestas));

    this.invitees = [];
    this.intitules = [];
    this.collegues = [this.collegues[0],this.collegues[1]];
    
    const now = new Date();
    let twoweeks = new Date();
    twoweeks = new Date(twoweeks.getTime() + 14 * 24 * 60 * 60 * 1000);
    let sixmonth = new Date();
    sixmonth = new Date(sixmonth.getTime() + 30 * 24 * 6 * 60 * 60 * 1000);
    this.values[0] = this.datePipe.transform(now, 'dd/MM/yyyy') || '';
    this.values[1] = maxs?maxs.maxDevis+1:'1';
    this.values[2] = this.datePipe.transform(now, 'yyyy') || '';
    this.values[3] = 'Cloé Chaudron';
    this.values[5] = '126 Rue de la Cerisaie';
    this.values[7] = '84400 Gargas';
    this.values[9] = '06.68.64.44.02';
    this.values[11] = 'cloe.chaudron@outlook.com';
    this.values[13] = this.datePipe.transform(twoweeks, 'dd/MM/yyyy') || '';
    this.values[14] = this.datePipe.transform(sixmonth, 'dd/MM/yyyy') || '';
    this.values[15] = '';
    this.values[16] = 'Virement';
    this.values[50] = "PLANNING";
    this.values[51] = this.datePipe.transform(sixmonth, 'dd/MM/yyyy') || '';
    this.values[52] = "";
    this.values[53] = "";
    this.values[54] = "";
    this.values[55] = maxs?maxs.maxFacture+1:'1';
    this.values[56] = this.datePipe.transform(now, 'yyyy') || '';
    this.values[57] = this.datePipe.transform(now, 'dd/MM/yyyy') || '';
    this.values[58] = this.datePipe.transform(twoweeks, 'dd/MM/yyyy') || '';
    this.values[60] = "";

    this.mode = this.data.mode;

    this.values[4] = this.data.nom;
    this.values[6] = this.data.adresse;
    this.values[8] = this.data.codepostal;
    this.values[10] = this.data.tel;
    this.values[12] = this.data.mail;
    this.values[14] = this.data.date;

    if(this.data.mode=='devis'&&this.data.devis)
      {
        if(this.data.devis.prestas)
          {
            this.data.devis.prestas.forEach((p:any)=>{
              let presta = this.prestas.find((pres:any)=>p.nom.includes(pres.nom));
              if(presta)
              {
                presta.qte = p.qte;
                presta.prix = p.prix;
                presta.reduc = p.reduc?p.reduc:0;
                presta.nom = p.nom;
              }
              else
              {
                this.prestas.push({qte:p.qte,nom:p.nom,prix:p.prix,reduc:(p.reduc?p.reduc:0)});
              }
            })
          }

          if(this.data.devis.creation) this.values[0] = this.data.devis.creation;
          if(this.data.devis.numero) this.values[1] = this.data.devis.numero;
          if(this.data.devis.annee) this.values[2] = this.data.devis.annee;
          if(this.data.devis.echeance) this.values[13] = this.data.devis.echeance;
      }
      else if(this.data.mode=='planning' && !this.data.planning.date)
      {
        this.planningprestas = [];
        let mariee : any;
        let prestas = this.data.devis.prestas;
        prestas.forEach((p:any)=>{
          let presta = this.prestas.find((pres:any)=>pres.nom == p.nom);
          if(presta&&presta.time)
          {
            p.coiffure = presta.coiffure;
            p.maquillage = presta.maquillage;
            p.time = presta.time;

            for(let i=0;i<p.qte;i++)
            {
              let press = JSON.parse(JSON.stringify(p));
              press.presta = 0;
              press.index = this.planningprestas.length;
              if(press.bride)mariee = JSON.parse(JSON.stringify(press));
              else
              {
                this.planningprestas.push(press);
                this.addInvitee(press);
              }
            }
          }
        });
        if(mariee)
        {
          mariee.index = this.planningprestas.length;
          this.planningprestas.push(mariee);
          this.addInvitee(mariee);
        }
      }
      else if(this.data.mode=='planning' && this.data.planning.date)
      {
        this.collegues = this.data.planning.collegues;
        this.invitees = this.data.planning.invitees;
        this.values[51] = this.data.planning.date;
        this.values[52] = this.data.planning.domaine;
        this.values[53] = this.data.planning.adresse;
        this.values[54] = this.data.planning.codepostal;
        this.planningprestas = this.data.planning.planningprestas;
        this.ceremonie = this.data.planning.ceremonie;
        this.finprestas = this.data.planning.finprestas;
      }
      else if(this.data.mode=='facture')
      {
        if(this.data.factureClicked!=-1)
        {
          let facture = this.data.factures[this.data.factureClicked];

          if(facture.prestas)
            {
              facture.prestas.forEach((p:any)=>{
                let presta = this.prestas.find((pres:any)=>p.nom.includes(pres.nom));
                if(presta)
                {
                  presta.qte = p.qte;
                  presta.prix = p.prix;
                  presta.reduc = p.reduc?p.reduc:0;
                  presta.nom = p.nom;
                }
                else
                {
                  this.prestas.push({qte:p.qte,nom:p.nom,prix:p.prix,reduc:(p.reduc?p.reduc:0)});
                }
              })
            }
  
            if(facture.creation) this.values[57] = facture.creation;
            if(facture.numero) this.values[55] = facture.numero;
            if(facture.annee) this.values[56] = facture.annee;
            if(facture.solde) this.values[60] = facture.solde;

            if(this.data.factures.length>0)
            {
              let prix = 0;
              for(let i=0;i<this.data.factureClicked;i++)
              {
                if(i!=this.data.factureClicked)
                {
                  let f = this.data.factures[i];
                  if(f.solde) prix += parseFloat(f.solde);
                  else
                  {
                    f.prestas.forEach((p:any)=>{
                      prix+=this.calc(p);
                    })
                  }
                }
              }
              this.values[15] = prix;
            }
        }
        else if(this.data.etape==1)
        {
          this.prestas.push({qte:1,nom:"Paiement Arrhes",prix:this.calcaresFromDevis(),reduc:0})
        }
        else if(this.data.etape>1)
        {
          this.data.devis.prestas.forEach((p:any)=>{
            let presta = this.prestas.find((pres:any)=>p.nom.includes(pres.nom));
            if(presta)
            {
              presta.qte = p.qte;
              presta.prix = p.prix;
              presta.reduc = p.reduc?p.reduc:0;
              presta.nom = p.nom;
            }
            else
            {
              this.prestas.push({qte:p.qte,nom:p.nom,prix:p.prix,reduc:(p.reduc?p.reduc:0)});
            }
          })
          let prix = 0;
          this.data.factures.forEach((f:any)=>{
            if(f.solde)prix += parseFloat(f.solde);
            else
            {
              f.prestas.forEach((p:any)=>{
                prix+=this.calc(p);
              })
            }

            f.prestas.forEach((p:any)=>{
              let prest = this.prestas.find((pres:any)=>pres.nom==p.nom&&pres.prix==p.prix&&pres.qte==p.qte);
              if(prest)prest.qte=0;
            })
          })
          this.values[15] = prix;
        }
      }

      this.inited=true;
  }

  changePrestataire(event: any, presta:any) {
    let artiste = event.target.value;

    let index = presta.index;
    let invitee = this.invitees.find((i:any)=>i[10]==index);
    let invindex = this.invitees.indexOf(invitee);

    let invartiste = this.invitees.filter((i:any)=>i[9]==invitee[9]);
    let indexartiste = invartiste.indexOf(invitee);
    if(invartiste.length>1 && indexartiste == 0)
    {
      invartiste[1][1] = invitee[1];
      invartiste[1][2] = invitee[2];
    }

    this.invitees.splice(invindex,1);
    this.addInvitee(presta, artiste);
  }

  getplanningprestas(i:number)
  {
    return this.planningprestas.filter((p:any)=>p.presta==i);
  }

  addPrestas()
  {
    let arrhes = this.prestas.find((p:any)=>p.nom=="Paiement Arrhes");
    if(arrhes) arrhes.qte = 0;
    this.data.devis.prestas.forEach((p:any)=>{
      let presta = this.prestas.find((pres:any)=>p.nom.includes(pres.nom));
      if(presta)
      {
        presta.qte = p.qte;
        presta.prix = p.prix;
        presta.reduc = p.reduc?p.reduc:0;
        presta.nom = p.nom;
      }
      else
      {
        let presta : any = {qte:p.qte,nom:p.nom,prix:p.prix,reduc:(p.reduc?p.reduc:0)};
        if(p.nom.includes("Frais de déplacement"))presta.kilorly = true;
        this.prestas.push(presta);
      }
    })
    let prix = 0;
    this.data.factures.forEach((f:any)=>{
      if(f.solde)prix += parseFloat(f.solde);
      else
      {
        f.prestas.forEach((p:any)=>{
          prix+=this.calc(p);
        })
      }

      f.prestas.forEach((p:any)=>{
        let prest = this.prestas.find((pres:any)=>pres.nom==p.nom&&pres.prix==p.prix&&pres.qte==p.qte);
        if(prest)prest.qte=0;
      })
    })
    this.values[15] = prix;
  }

  async onFileSelected(event: Event)
  {
    let tmp : any= await this.readPDF.onFileSelected(event);
    if(tmp.date) this.values[0] = tmp.date;
    if(tmp.devis) this.values[1] = tmp.devis;
    if(tmp.annee)this.values[2] = tmp.annee;
    if(tmp.nom)this.values[4] = tmp.nom;
    if(tmp.adresse)this.values[6] = tmp.adresse;
    if(tmp.codepostal)this.values[8] = tmp.codepostal;
    if(tmp.tel)this.values[10] = tmp.tel;
    if(tmp.mail)this.values[12] = tmp.mail;
    if(tmp.echeance)this.values[13] = tmp.echeance;
    if(tmp.prestas)
    {
      tmp.prestas.forEach((p:any)=>{
        let presta = this.prestas.find((pres:any)=>pres.nom==p.nom);
        if(presta)
        {
          presta.qte = p.qte;
          presta.prix = p.prix;
          presta.reduc = p.reduc?p.reduc:0;
        }
        else
        {
          this.prestas.push({qte:p.qte,nom:p.nom,prix:p.prix,reduc:(p.reduc?p.reduc:0)});
        }
      })
    }
  }

  getDateArrhes(){
    if(this.data.factures[0])
    {
      return '('+this.data.factures[0].creation+')';
    }
    return "";
  }

  return(){
    this.init();
    this.retour.emit();
  }

  save()
  {
    if(this.mode=='devis')
    {
      let devis : any = {};
      devis.prestas = this.prestas.filter((p:any)=>p.qte>0 || p.qte=="?");
      devis.creation = this.values[0];
      devis.numero = this.values[1];
      devis.annee = this.values[2];
      devis.echeance = this.values[13];
      this.data.devis = devis;
      if(this.data.etape==0)this.data.etape = 1;
    }
    else if(this.mode=='facture')
    {
      let facture : any = {};
      facture.prestas = this.prestas.filter((p:any)=>p.qte>0 || p.qte=="?");
      facture.creation = this.values[57];
      facture.numero = this.values[55];
      facture.annee = this.values[56];
      facture.solde = this.calcTot(true);
      if(this.values[60]) facture.solde = this.values[60];
      if(this.data.factures.length==0)
      {
        this.data.etape = 2;
        if(this.data.statut=="demande")this.data.statut = "reserve";
      }
      if(this.data.factureClicked==-1)this.data.factures.push(facture);
      else this.data.factures[this.data.factureClicked] = facture;
    }
    else if(this.mode=="planning")
    {
      let planning : any = {};
      planning.date = this.values[51];
      planning.domaine = this.values[52];
      planning.adresse = this.values[53];
      planning.codepostal = this.values[54];
      planning.invitees = this.invitees;
      planning.collegues = this.collegues;
      planning.planningprestas = this.planningprestas;
      planning.ceremonie = this.ceremonie;
      planning.finprestas = this.finprestas;
      this.data.planning = planning;
    }
    
    if(this.values[4]!="")this.data.nom = this.values[4];
    if(this.values[6]!="")this.data.adresse = this.values[6];
    if(this.values[8]!="")this.data.codepostal = this.values[8];
    if(this.values[10]!="")this.data.tel = this.values[10];
    if(this.values[12]!="")this.data.mail = this.values[12];

    this.retour.emit();
  }

  checkRow(row: number, col: number, c:number): number {
    let tab = this.getInvitees(c);

    const value = tab[row][col];
    let count = 1;
    
    for (let i = row + 1; i < tab.length; i++) {
        if (value != "" && tab[i][col] === value) {
            count++;
        } else {
            break;
        }
    }

    return count;
}

calculate()
{
  this.invitees.sort((a:any,b:any)=>{return (this.toDate(a[5]) - this.toDate(b[5]))});
}

actualiser()
{
  for(let i=0;i<this.collegues.length;i++)
  {
    let invitees = this.invitees.filter((inv:any)=>inv[9]==i)
    for(let j=0;j<invitees.length;j++)
    {
      let invitee = invitees[j];
      let presta = this.planningprestas.find((p:any)=>p.index==invitee[10]);
      if(j==0)
      {
        let debut = "";
        if(presta.maquillage) debut = invitee[3];
        else if(presta.coiffure) debut = invitee[4];

        let arrivee = this.addMinutesToTime(debut,-30);
        let installation = this.addMinutesToTime(debut,-15);

        invitee[1] = arrivee;
        invitee[2] = installation;
        invitee[5] = this.addMinutesToTime(debut,presta.time);
      }
      else
      {
        let debut = invitees[j-1][5];

        invitee[3] = presta.maquillage?debut:"";
        invitee[4] = presta.coiffure?debut:"";
        invitee[5] = this.addMinutesToTime(debut,presta.time);
      }
    }
  }

  let tab : any = [];
    this.invitees.forEach((i:any)=>{
      tab.push(JSON.parse(JSON.stringify(this.planningprestas.find((p:any)=>i[10]==p.index))));
    })
    this.planningprestas = tab;
}

addInvitee(presta:any,artiste:any=0)
{  
  let invitees = this.invitees.filter((i:any)=>i[9]==artiste);
  if(invitees.length==0)
  {
    let arrivee = this.collegues[artiste][4]!=""?this.collegues[artiste][4]:"8h30";
    let installation = this.addMinutesToTime(arrivee,15);
    let debut = this.addMinutesToTime(arrivee,30);

    this.invitees.push([
      presta.bride?1:0,
      arrivee,
      installation,
      presta.maquillage?debut:"",
      presta.coiffure?debut:"",
      this.addMinutesToTime(debut,presta.time),
      this.collegues[artiste][5]!=""?this.collegues[artiste][5]:"",
      this.collegues[artiste][6]!=""?this.collegues[artiste][6]:"",
      this.ceremonie!=""?this.ceremonie:"",
      artiste,
      presta.index
    ]);
  }
  else
  {
    this.invitees.push([
      presta.bride?1:0,
      "",
      "",
      presta.maquillage?invitees[invitees.length-1][5]:"",
      presta.coiffure?invitees[invitees.length-1][5]:"",
      this.addMinutesToTime(invitees[invitees.length-1][5],presta.time),
      this.collegues[artiste][5]!=""?this.collegues[artiste][5]:"",
      this.collegues[artiste][6]!=""?this.collegues[artiste][6]:"",
      this.ceremonie!=""?this.ceremonie:"",
      artiste,
      presta.index
    ]);
  }
  if(this.ceremonie!=""||this.finprestas!="")
  {
    this.onCeremonieInput();
  }
  else
  {
    this.actualiser();
  }
}

cloeFinishesLater(data: any): boolean {
  // Fonction pour convertir un horaire "10h20" en minutes
  const horaireToMinutes = (horaire: string): number => {
      const [heures, minutes] = horaire.split("h").map(Number);
      return heures * 60 + minutes;
  };

  let maxHoraire1 = -Infinity;
  let maxHoraire2 = -Infinity;

  for (const row of data) {
      const horaire = horaireToMinutes(row[5]);
      if (row[9] === 0) {
          maxHoraire1 = Math.max(maxHoraire1, horaire);
      } else if (row[9] === 1) {
          maxHoraire2 = Math.max(maxHoraire2, horaire);
      }
  }

  return maxHoraire1 > maxHoraire2;
}

getInvitees(c:any)
{
  return this.invitees.filter((i:any)=>i[9]==c);
}

trackByIndex(index: number, item: any): number {
  return index;
}

getNbInvitee(c:number, i:number, t:any)
{
  let tab = this.getInvitees(c);
  let count = 1;
  for(let x=0;x<i;x++)
  {
    if(tab[x][0]==t)count++;
  }
  return count;
}

changetypeinvitee(invitee:any,change:boolean=false, temps:any=0)
{
  if(change){invitee[0]=(invitee[0]==0?1:0);}

  if(temps!=0)
  {
    if(invitee[3]!="")invitee[5]=this.addMinutesToTime(invitee[3],temps);
    else if(invitee[4]!="")invitee[5]=this.addMinutesToTime(invitee[4],temps);
  }
  else if(invitee[0]==1)
  {
    if(invitee[3]!=""&&invitee[4]!="")invitee[5]=this.addMinutesToTime(invitee[3],120);
    else if(invitee[3]!="")invitee[5]=this.addMinutesToTime(invitee[3],60);
    else if(invitee[4]!="")invitee[5]=this.addMinutesToTime(invitee[4],60);
  }
  else if(invitee[0]==0)
  {
    if(invitee[3]!=""&&invitee[4]!="")invitee[5]=this.addMinutesToTime(invitee[3],75);
    else if(invitee[3]!="")invitee[5]=this.addMinutesToTime(invitee[3],45);
    else if(invitee[4]!="")invitee[5]=this.addMinutesToTime(invitee[4],45);
  }
}

toDate(time:string):any
{
  let [hours, minutes] = time.split("h").map(Number);

  // Créer un objet Date avec l'heure et les minutes
  let date = new Date();
  date.setHours(hours);
  date.setMinutes(minutes);

  return date;
}

addMinutesToTime(timeStr: string, minutesToAdd: number): string {
  // Extraire l'heure et les minutes depuis le format "HHhMM"
  let [hours, minutes] = timeStr.split("h").map(Number);

  // Créer un objet Date avec l'heure et les minutes
  let date = new Date();
  date.setHours(hours);
  date.setMinutes(minutes + minutesToAdd);

  // Récupérer la nouvelle heure et minutes
  let newHours = date.getHours();
  let newMinutes = date.getMinutes();

  let retour = newHours + 'h' +(newMinutes<10?'0'+newMinutes:newMinutes);

  // Formater en "HHhMM" (ajout d'un zéro si besoin)
  return retour;
}

deleteInvitee(i:any)
{
  this.invitees.splice(i,1);

  this.calculate();
}
deleteCollegue(i:any)
{
  this.collegues.splice(i,1);
}

checkCol(row: number, col: number, c:number): number {
  let tab = this.getInvitees(c);

  const value = tab[row][col];
  let count = 1;
  
  for (let i = col + 1; i < tab[row].length; i++) {
      if (value != "" && tab[row][i] === value) {
          count++;
      } else {
          break;
      }
  }

  return count;
}

checkDisplay(row: number, col: number, c:number) {
  let tab = this.getInvitees(c);

  const value = tab[row][col];
  if(value != "" && tab[row][col-1]===value) return true;
  if(row>0&&value != "" && tab[row-1][col]===value) return true;
  else return false;
}

  generatePDFfromHTML() {
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
      if (this.mode == 'planning')
      {
        nom = 'PLANNING_'+this.values[51];
      }
      else
      {
        let value = this.values[1];
        let annee = this.values[2];
        if(this.mode == "facture") 
        {
          value = this.values[55];
          annee = this.values[56];
        }
        if (value < 100) nom = nom + '0';
        if (value < 10) nom = nom + '0';
        nom = nom + value;
        nom = nom + '_' + annee;
      }

      pdf.save(nom + '.pdf');
      //this.trackVisit();
    });
  }

  addCollegue()
  {
    this.collegues.push(["","","","","","",""]);
  }

  getCollegues()
  {
    let retour = [];
    for(let i=0;i<this.collegues.length;i++)
    {
      if(this.getInvitees(i).length>0)retour.push(this.collegues[i]);
    }
    return retour;
  }

  addPresta() {
    this.prestas.push({ nom: '', qte: 0, prix: 50, reduc: '' });
  }

  remplir(i:number)
  {
    for(let c=0;c<this.collegues.length;c++)
    {
      let invitees = this.getInvitees(c);
      let invitee = invitees.find((inv:any)=>inv[i]!="");
      
      if(invitee)
      {
        if(i!=8)
        {
          invitees.forEach((inv:any)=>{
            inv[i] = invitee[i];
          });
        }
        else
        {
          this.invitees.forEach((inv:any)=>{
            inv[i] = invitee[i];
          });
        }
      }
    }
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
    if(Number.isInteger(presta.prix) || presta.kilorly) prix = Math.floor(prix);
    return prix;
  }

  calcTot(calcDeja: boolean = false) {
    let prix = 0;
    this.prestas
      .filter((presta: any) => presta.qte > 0)
      .forEach((presta: any) => {
        prix += this.calc(presta);
      });
    if (calcDeja && this.values[15] != '') prix = prix - this.values[15];
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
    if(typeof value === "string")
    {
      value = value.replace(/[^0-9\.,]/g,"");
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

  getDevis() {
    this.http
      .get<any>(
        'http' +
          (isDevMode() ? '' : 's') +
          '://chiyanh.cluster031.hosting.ovh.net/devisget'
      )
      .subscribe((data) => {
        this.values[1] = data.num;
      });
  }

  formatDate(dateStr: any) {
    const [day, month, year] = dateStr.split('/'); // Sépare le format dd/mm/yyyy
    return this.lg === 'Anglais' ? `${month}/${day}/${year}` : dateStr;
  }

  trackVisit() {
    const dataToSend = {
      num: this.values[1] + 1,
    };
    from(
      fetch(
        'http' +
          (isDevMode() ? '' : 's') +
          '://chiyanh.cluster031.hosting.ovh.net/devisset',
        {
          body: JSON.stringify(dataToSend),
          headers: {
            'Content-Type': 'application/json',
          },
          method: 'POST',
          mode: 'no-cors',
        }
      )
    ).subscribe((data: any) => {});
  }
}
