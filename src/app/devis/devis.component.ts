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
    },
    {
      nom: 'Maquillage Mariée',
      en: 'Bride Makeup',
      prix: 220,
      onlyOne: true,
      bride: true,
    },
    {
      nom: 'Coiffure Mariée',
      en: 'Bride Hairstyling',
      prix: 220,
      onlyOne: true,
      bride: true,
    },
    {
      nom: 'Maquillage et coiffure supplémentaire (Mariage civil, seconde mise en beauté)',
      en: 'Additional Makeup and Hairstyling (Civil Wedding, Second Beauty Touch-Up)',
      prix: 300,
      bride: true,
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
    },
    {
      nom: 'Coiffure Invitée (Attache complète)',
      en: 'Guest Hairstyling (Full Updo)',
      prix: 80,
    },
    {
      nom: 'Coiffure Invitée (Attache partielle)',
      en: 'Guest Hairstyling (Partial Updo)',
      prix: 70,
    },
    {
      nom: 'Brushing Hollywoodien Invitée',
      en: 'Hollywood Blowout (Guest)',
      prix: 70,
    },
    {
      nom: 'Maquillage Invitée',
      en: 'Guest Makeup',
      prix: 65,
    },
    {
      nom: 'Coiffure enfant (-13ans)',
      en: 'Child Hairstyling (-13 years)',
      prix: 30,
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

  typeinvitee = ["Invitée","Mariée"]

  collegues = [
    ["Cloé","CHAUDRON","06.68.64.44.02","cloe.chaudron@outlook.com"],
    ["Celma","SAHIDET","06.80.84.42.52","sahidetcelma@gmail.com"]
  ]

  invitees:any = [[0,"8h30","8h45","9h00","9h00","10h15","15h30 à 16h00","jusqu'à 16h00","16h00",0]];

  planningtop = [{
    fr:"ARRIVEE"
  },{
    fr:"INSTALLATION"
  },{fr:"MAQUILLAGE"},{fr:"COIFFURE"},{fr:"FIN PRESTATION"},{fr:"RETOUCHES"},{fr:"DISPONIBILITE"},{fr:"CEREMONIE"}]

  lg = 'Français';

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

  deleteAll()
  {
    this.prestas.forEach((p:any)=>p.qte=0);
  }


  init(maxs:any = undefined)
  {
    this.inited=false;
    this.prestas = JSON.parse(JSON.stringify(this.baseprestas));
    
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
        this.values[51]=this.data.date;
        if(this.data.mariage&&this.data.mariage.domaine)this.values[52]=this.data.mariage.domaine;
        if(this.data.mariage&&this.data.mariage.adresse)this.values[53]=this.data.mariage.adresse;
        if(this.data.mariage&&this.data.mariage.codepostal)this.values[54]=this.data.mariage.codepostal;

        if(this.data.devis&&this.data.devis.prestas)
        {
          this.invitees = [];
          let renfort = false;
          this.data.devis.prestas.forEach((p:any)=>{
            if(p.nom.includes("Renfort")||p.nom.includes("renfort")) renfort = true;
            if(p.bride && !this.invitees.find((i:any)=>i[0]==1))
            {
              this.addInvitee();
              if(!p.nom.includes("Forfait"))
              {
                if(p.nom.includes("Maquillage"))this.invitees[this.invitees.length-1][4] = "";
                else if(p.nom.includes("Coiffure"))this.invitees[this.invitees.length-1][3] = "";
              }
              this.changetypeinvitee(this.invitees[this.invitees.length-1],true);
            }
            else if(p.nom.includes("Invitée"))
            {
              for(let i=0;i<p.qte;i++)
              {
                this.addInvitee();
                if(!p.nom.includes("Forfait"))
                {
                  if(p.nom.includes("Maquillage"))this.invitees[this.invitees.length-1][4] = "";
                  else if(p.nom.includes("Coiffure"))this.invitees[this.invitees.length-1][3] = "";
                }
                this.changetypeinvitee(this.invitees[this.invitees.length-1]);
              }
            }
          });
          if(renfort)
          {
            let invitees = this.invitees.filter((p:any)=>p[0]==0);
            let nb = Math.floor(invitees.length/2);
            if(nb>0)
            {
              for(let i=0;i<nb;i++)
              {
                let pos = invitees.length-nb+i;
                invitees[pos][9] = 1;
                if(i==0)
                {
                  invitees[pos][1] = this.invitees[0][1];
                  invitees[pos][2] = this.invitees[0][2];
  
                  if(invitees[pos][3]!="")
                  {
                    if(this.invitees[i][3])invitees[pos][3] = this.invitees[i][3];
                    else if(this.invitees[i][4])invitees[pos][3] = this.invitees[i][4];
                  }
                  if(invitees[pos][4]!="")
                  {
                    if(this.invitees[i][3])invitees[pos][4] = this.invitees[i][3];
                    else if(this.invitees[i][4])invitees[pos][4] = this.invitees[i][4];
                  }
                }
                else
                {
                  console.log(invitees[pos],invitees[pos-1]);
                  if(invitees[pos][3]!="")invitees[pos][3]=invitees[pos-1][5];
                  if(invitees[pos][4]!="")invitees[pos][4]=invitees[pos-1][5];
                }
                
                this.changetypeinvitee(invitees[pos]);
              }
            }
          }
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
  this.calculate();
}

addInvitee()
{
  this.calculate();
  
  if(this.invitees.length==0)
  {
    this.invitees.push([0,"8h30","8h45","9h00","9h00","10h15","","","",0]);
  }
  else
  {
    this.invitees.push([
      0,
      "",
      "",
      this.invitees.length>0?this.invitees[this.invitees.length-1][5]:"",
      this.invitees.length>0?this.invitees[this.invitees.length-1][5]:"",
      this.invitees.length>0?this.addMinutesToTime(this.invitees[this.invitees.length-1][5],75):"",
      this.invitees.length>0?this.invitees[this.invitees.length-1][6]:"",
      this.invitees.length>0?this.invitees[this.invitees.length-1][7]:"",
      this.invitees.length>0?this.invitees[this.invitees.length-1][8]:"",
      this.invitees.length>0?this.invitees[this.invitees.length-1][9]:0
    ]);
  }
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

changetypeinvitee(invitee:any,change:boolean=false)
{
  if(change){invitee[0]=(invitee[0]==0?1:0);}

  if(invitee[0]==1)
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

  let retour = newHours + 'h' +(newMinutes<10?newMinutes+'0':newMinutes);

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
        if (this.values[1] < 100) nom = nom + '0';
        if (this.values[1] < 10) nom = nom + '0';
        nom = nom + this.values[1];
        nom = nom + '_' + this.values[2];
      }

      pdf.save(nom + '.pdf');
      //this.trackVisit();
    });
  }

  addCollegue()
  {
    this.collegues.push(["","","",""]);
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
