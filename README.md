# AI Fish Sort

AI Fish Sort on Xamkin hanke, jossa kehitetään tekoälyyn ja kuvantamiseen perustuvaa ratkaisua kalojen automaattiseen tunnistamiseen ja lajitteluun. Hankkeen tavoitteena on tehostaa kotimaisen kalan käsittelyä, parantaa lajittelun tarkkuutta ja luoda skaalautuva prototyyppi jatkokehitystä varten.

Hankkeessa rakennetaan järjestelmä, jonka avulla saatua kaladataa voidaan säilöä sekä tarjota rajapinta datan hyödyntämiseen. Ratkaisun tavoitteena on olla avoin ja modulaarinen, jotta sitä voidaan kehittää eteenpäin hankkeen edetessä.

## Projektin tavoite

Projektin pitkän aikavälin tavoitteena on tukea kotimaisen kalan hyödyntämistä kehittämällä ratkaisu, joka voi tunnistaa ja lajitella yleisiä suomalaisia kalalajeja tekoälyn ja kuvantamisen avulla. Järjestelmän avulla voidaan tulevaisuudessa kerätä, analysoida ja hyödyntää lajitteludataa avoimemmin ja tehokkaammin.

## Teknologiat

Projektissa hyödynnetään konttiteknologiaa, jotta järjestelmä voidaan ajaa ja siirtää ympäristöstä toiseen mahdollisimman helposti.

Käytössä olevia teknologioita:

- **Node.js** – taustajärjestelmän ja API-rajapinnan toteutus
- **MySQL** – relaatiotietokanta kaladatan ja järjestelmän tietojen tallentamiseen
- **Sequelize** – tietokantaoperaatioiden hallintaan Node.js-sovelluksessa
- **HBS / Handlebars** – palvelinpuolen näkymien renderöintiin
- **Docker** – sovelluksen ja tietokannan ajamiseen kontteina

## Järjestelmän asennus

Järjestelmän ajaminen perustuu konttiteknologiaan. Tämän avulla tietokanta ja taustajärjestelmä voidaan käynnistää hallitusti ilman, että kaikkia riippuvuuksia tarvitsee asentaa suoraan kehittäjän koneelle.

### 1. Käynnistä tietokanta

Aja ensin tietokannan käynnistyskomento:

```bash
StartDatabase
```

Tämä käynnistää järjestelmän käyttämän MySQL-tietokannan. Oletuksena käytetään porttia 3306. Jos portti on käytössä tai haluat käyttää eri porttia, vaihda se **MySQL/Docker-compose** -tiedostoon. Uusi portti pitää vaihtaa myös taustajärjestelmään **config/config.json**. 

### 2. Yhdistämisosoite ja tunnukset
Yhdistäminen on rakennettu taustajärjestelmän **config/config.json** -tiedostoon. Ennen kuin taustajärjestelmä asennetaan ulkopuoliseen serveriin, tulee yhdistämisosoite vaihtaa. Config-tiedostosta tulee vaihtaa **"host"** sekä **"port"** niihin arvoihin jotka täsmäävät omaan tietokoneeseen. IP-osoitteen saa selvillä komentokehoitteessa komennolla **ipconfig**.

**Huom! Yhdistämisosoite siirtyy myöhemmin ympäristömuuttujiin (env)**

### 3. Käynnistä sovellus Dockerilla

Kun tietokanta on käynnissä ja yhdistämisosoite on oikein, aja seuraava komento:

```bash
rebuild-docker
```

Tämä komento sulkee olemassa olevan kontin, rakentaa tarvittavat osat uudelleen ja käynnistää kontin uudestaan.

### 4. Vaihtoehtoinen käynnistystapa

Jos Node.js on asennettuna suoraan koneelle, sovelluksen voi käynnistää myös ilman Dockeria komennolla:

```bash
npm start
```

Tätä tapaa voidaan käyttää esimerkiksi kehitysympäristössä, jos halutaan ajaa Node.js-sovellusta paikallisesti ilman Docker-konttia.

### 5. Tietokannan tyhjentäminen
Tietokanta voidaan tyhjentää ja luoda uudelleen komennolla:
```bash
resetDatabase
```
**Komento tulee ajaa kun järjestelmä käynnistetään ensimmäistä kertaa. Tämän avulla saadaa admin-tunnukset sekä mock-up data.**

## Huomioitavaa

AI Fish Sort -järjestelmä on vielä kehitysvaiheessa. Lopullista lajittelulaitetta ei ole vielä käytössä, eikä lopullinen kerättävä datasisältö ole täysin varmistunut.

Tästä syystä järjestelmä pyritään pitämään mahdollisimman modulaarisena. Toteutus voi muuttua hankkeen edetessä, kun lajittelulaitteesta, datasta ja loppukäyttäjien tarpeista saadaan tarkempaa tietoa.
