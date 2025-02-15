import { Injectable } from '@angular/core';
import { getDocument } from 'pdfjs-dist';
import Tesseract from 'tesseract.js';

@Injectable({
  providedIn: 'root'
})
export class ReadpdfService {

  cloe = ["Cloé Chaudron", "Clo¢ Chaudron", "Cloe Chaudron", "126 Rue de la Cerisaie", "84400 Gargas", "06.68.64.44.02", "cloe.chaudron@outlook.com"];

  extractedText : any;

  constructor() { }

  async convertPdfToText(pdfFile: File): Promise<string> {
    const reader = new FileReader();

    return new Promise((resolve, reject) => {
      reader.onload = async () => {
        try {
          const arrayBuffer = reader.result as ArrayBuffer;
          const pdf = await getDocument({ data: arrayBuffer }).promise;
          let text = '';

          // Convertir chaque page du PDF en image et appliquer l'OCR
          for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
            const page : any = await pdf.getPage(pageNumber);

            // Convertir la page en image (render)
            const canvas = await this.renderPageToCanvas(page);
            const img = canvas.toDataURL('image/png');

            // Appliquer l'OCR à l'image
            const extractedText = await this.performOcrOnImage(img);
            text += extractedText + '\n\n';
          }

          resolve(text); // Renvoie le texte extrait
        } catch (error:any) {
          reject('Erreur lors de la conversion du PDF en texte: ' + error.message);
        }
      };

      reader.onerror = () => reject('Erreur de lecture du fichier PDF');
      reader.readAsArrayBuffer(pdfFile);
    });
  }

  private async renderPageToCanvas(page: any): Promise<HTMLCanvasElement> {
    const viewport = page.getViewport({ scale: 4 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Impossible de récupérer le contexte du canvas');

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;

    return canvas;
  }

  private async performOcrOnImage(imgData: string): Promise<string> {
    return new Promise((resolve, reject) => {
      Tesseract.recognize(
        imgData,
        'eng+fra',//this.lang, // Langue de l'OCR (ici en anglais, mais tu peux en ajouter d'autres comme 'fra' pour le français)
        {
          logger: (m) => null, // Affiche le suivi du processus OCR
        }
      ).then(({ data: { text } }) => {
        resolve(text);
      }).catch((error) => {
        reject('Erreur OCR: ' + error.message);
      });
    });
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      try {
        this.extractedText = await this.convertPdfToText(file);
        return this.treat(this.extractedText.split("\n"));
      } catch (error) {
        this.extractedText = 'Erreur lors de l\'extraction du texte';
        console.error(error);
      } finally {
      }
    }
  }

  treat(tab:any)
  {
    let obj : any = {};
    tab.forEach((ligne:any)=>{
      if(ligne.startsWith("Date :"))
      {
        obj.date = ligne.replace(/[^0-9/]/g,"");
      }
      else if(ligne.startsWith("DEVIS N°"))
      {
        ligne = ligne.replace(/[^0-9-]/g,"");
        obj.devis = parseInt(ligne.substring(0,ligne.indexOf("-")));
        obj.annee = ligne.substring(ligne.indexOf("-")+1);
      }
      else if(ligne.includes("€"))
      {
        let match = ligne.match(/^([0-9]+ *(km|h)? *|[ÀA] d[eé]finir *)/g);
        if(match)
        {
          let qte = match[0];
          let presta : any = {};

          presta.qte = qte.replace(/[^0-9]/g,"");
          if(qte.includes("km"))
            presta.qte = presta.qte / 2;
          else if(presta.qte=="") 
            presta.qte = "?";

          ligne = ligne.substring(match[0].length);

          match = ligne.match(/[0-9\.,/kmh]+€/g)[0];
          presta.prix = parseFloat(match.replace(/[^0-9,\.]/g, ""));

          presta.nom = ligne.substring(0,ligne.indexOf(match)).replace(/ *$/g, "");

          let reste = ligne.substring(ligne.indexOf(match)+match.length);

          match = reste.match(/[0-9\.,]+%/g);

          if(match)
          {
            presta.reduc = parseFloat(match[0].replace(/[^0-9\.,]/, ""));
          }

          if(!obj.prestas)obj.prestas = [];
          obj.prestas.push(presta);
        }
        else
        {
          let match = ligne.match(/[ÉéEe]ch[ée]ance *: */g);
          if(match)
          {
            obj.echeance = ligne.substring(match[0].length);
            obj.echeance = obj.echeance.substring(0,obj.echeance.indexOf(" "));
          }

          match = ligne.match(/[Tt]otal */g);
          if(match)
          {
            obj.total = ligne.substring(ligne.indexOf(match[0]));
            obj.total = parseFloat(obj.total.replace(/[^0-9\.,]/g, ""));
          }

          match = ligne.match(/Montant arrhes *: */g);
          if(match)
          {
            obj.arrhes = ligne.substring(match[0].length);
            obj.arrhes = parseFloat(obj.arrhes.replace(/[^0-9\.,]/g, ""));
          }
        }
      }
      else if(ligne.startsWith("Prestation le : "))
      {
        obj.prestation = ligne.substring(ligne.indexOf(":")+2);
        obj.prestation = obj.prestation.substring(0,obj.prestation.indexOf(" "));
      }
      else
      {
        this.cloe.forEach((info:any)=>{
          if(ligne.startsWith(info+" "))
          {
            ligne = ligne.substring((info+" ").length);
            if(ligne.includes("@")) obj.mail = ligne;
            else if(ligne.replace(/[^0-9]/g,"").match(/[0-9]{8,12}/g)) obj.tel = ligne;
            else if(ligne.match(/[a-zA-Z ]*[0-9\. ]{5,6}[a-zA-Z ]*/g)) obj.codepostal = ligne;
            else if(ligne.match(/[0-9]+/)) obj.adresse = ligne;
            else obj.nom = ligne;
          }
        })
        
      }
    })
    return obj;
  }
}
