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

Tämä käynnistää järjestelmän käyttämän MySQL-tietokannan. Docker Desktopin pitää käyttää Linux-kontteja. Oletuksena käytetään porttia 3306. Jos portti on käytössä tai haluat käyttää eri porttia, vaihda se **MySQL/docker-compose.yml** -tiedostoon ja sovelluksen `.env`-tiedoston `DB_PORT`-asetukseen. Odota, että MySQL on käynnistynyt ennen sovelluksen rebuildia. Rebuild ei käynnistä tai nollaa tietokantaa.

### 2. Yhdistämisosoite ja tunnukset

Kopioi `.env.example` tiedostoksi `.env` ja täytä `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `SESSION_SECRET` ja `WRITE_API_KEY`. `DB_PASSWORD` on tietokannan nykyinen salasana. Paikallisessa Node.js-ajossa `DB_HOST` on tietokannan osoite, esimerkiksi `127.0.0.1`.

Kontin paikallinen rebuild korvaa tietokantahostin arvolla `host.docker.internal`, joten sovellus löytää Docker Desktopin kautta koneen porttiin 3306 julkaistun MySQL:n. Muut tietokanta-asetukset tulevat `.env`:stä. Vanha `config/config.json` toimii edelleen paikallisen Node.js-ajon varana niille asetuksille, joita `.env` ei määritä. Sitä tai `.env`:tä ei kopioida imageen.

### 3. Käynnistä sovellus Dockerilla

Kun tietokanta on käynnissä ja yhdistämisosoite on oikein, aja seuraava komento:

Jos kanta on uusi, aja alempana kuvatut migraatio- ja seed-komennot ennen ensimmäistä sovelluskontin käynnistystä.

```powershell
.\rebuild-docker.bat
```

Skripti rakentaa imagen `ai-fish-sort-api` ennen vanhan samannimisen sovelluskontin korvaamista. Se odottaa `/health`-reitiltä onnistunutta tietokantayhteyttä ja näyttää virhetilanteessa kontin lokit. Sovellus avautuu osoitteessa http://localhost:3000. Kontti toimii `node`-käyttäjänä ja käynnistyy automaattisesti uudelleen Dockerin käynnistyessä.

Skripti toimii myös toisesta työhakemistosta. Valinnainen `--no-pause` sopii automaattisiin ajoihin. Portin tai ulkoisen tietokantahostin voi vaihtaa ennen ajoa:

```powershell
$env:FISH_HTTP_PORT = '3002'
$env:FISH_DB_HOST = 'host.docker.internal'
.\rebuild-docker.bat --no-pause
```

Paikallinen rebuild julkaisee HTTP-portin vain osoitteeseen `127.0.0.1`. Itsenäisen imagen voi rakentaa ja käynnistää myös muussa Docker-ympäristössä; tällöin `.env`:n `DB_HOST` pitää osoittaa siellä saavutettavaan tietokantaan:

```bash
docker build --target runtime -t ai-fish-sort-api .
docker run -d --init --name ai-fish-sort-api --restart unless-stopped --env-file .env -p 3000:3000 ai-fish-sort-api
docker logs -f ai-fish-sort-api
```

`/health` palauttaa HTTP 200 toimivalla tietokantayhteydellä ja HTTP 503 yhteyden epäonnistuessa. Myös Dockerin healthcheck käyttää tätä reittiä. Sovelluksen nykyinen käynnistys luo puuttuvat mallitaulut Sequelize `sync()` -kutsulla; rebuild ei aja seedereitä tai tietokannan resetointia.

Migraatioita varten Dockerfilessä on erillinen target, joka sisältää `sequelize-cli`:n:

```bash
docker build --target migrations -t ai-fish-sort-migrations .
docker run --rm --env-file .env -e DB_HOST=host.docker.internal ai-fish-sort-migrations
```

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
**Reset poistaa nykyisen tietokannan sisällön. Käytä sitä vain tyhjennettävään kehityskantaan.** Uuteen kantaan admin-tunnukset ja mock-up data voidaan luoda migraatioimagen avulla ilman resetointia:

```bash
docker run --rm --env-file .env -e DB_HOST=host.docker.internal ai-fish-sort-migrations npm run db:migrate
docker run --rm --env-file .env -e DB_HOST=host.docker.internal ai-fish-sort-migrations npm run db:seed
```

Sovellusimagen mukana ovat vain ajonaikaiset riippuvuudet. Paikalliset tietokanta-asetusten ja health-reitin testit ajetaan komennolla `npm test`.

## Huomioitavaa

### Pyyntömäärien rajoittaminen

Sovellus käyttää `express-rate-limit`-kirjastoa. Rajat lasketaan asiakkaan IP-osoitteesta; IPv6-osoitteet ryhmitellään `/56`-aliverkoittain osoitteita vaihtamalla tehtävän kiertämisen estämiseksi. Raja tarkistetaan ennen rungon jäsentämistä, istunnon lataamista ja varsinaisten reittien tietokantakyselyitä.

| Kohde | Oletus / IP | `.env`-asetus |
| --- | --- | --- |
| Sivut, admin, staattiset tiedostot ja sivujen 404-pyynnöt | 300 / minuutti | `RATE_LIMIT_WEB_MAX` |
| `/api` ja sen alireitit, myös virheelliset pyynnöt | 120 / minuutti | `RATE_LIMIT_API_MAX` |
| API-kirjoitukset: muut kuin GET, HEAD ja OPTIONS | 60 / minuutti | `RATE_LIMIT_API_WRITE_MAX` |
| POST `/login` | 10 / 15 minuuttia | `RATE_LIMIT_AUTH_MAX` |
| POST `/admin/change-password` | 10 / 15 minuuttia, erillinen laskuri | `RATE_LIMIT_AUTH_MAX` |

API-kirjoitus kuluttaa myös API:n yleistä kiintiötä. Kirjautuminen ja salasanan vaihto kuluttavat myös sivujen kiintiötä. Kirjautumisrajassa lasketaan kaikki POST-yritykset, myös onnistuneet ja virheelliset. Tavallisten rajojen aikaikkuna säädetään millisekunteina asetuksella `RATE_LIMIT_WINDOW_MS` (60000), kirjautumisrajan aikaikkuna asetuksella `RATE_LIMIT_AUTH_WINDOW_MS` (900000). Asetusten pitää olla positiivisia kokonaislukuja. Nykyinen datageneraattori lähettää kaksi havaintoa minuutissa, joten se mahtuu oletusrajoihin.

Rajan ylittävä pyyntö saa HTTP 429:n ja `Retry-After`-otsakkeen. API palauttaa normaalin virherakenteen koodilla `RATE_LIMIT_EXCEEDED`; sivut palauttavat suomenkielisen tekstin. Vastauksissa ovat `RateLimit`- ja `RateLimit-Policy`-otsakkeet. `/health` ohittaa rajoitukset, jotta Dockerin valmiustarkistukset eivät kuluta käyttäjien kiintiöitä. `.env`-muutokset tulevat käyttöön seuraavalla rebuildilla.

Paikallisessa Docker-ajossa `TRUST_PROXY=false`. Asiakkaan lähettämää `X-Forwarded-For`-otsaketta ei tällöin käytetä IP-osoitteena. Reverse proxyn takana määritä `TRUST_PROXY`-arvoksi vain todellisten proxyjen IP-osoitteet tai CIDR-verkot pilkuilla eroteltuna ja estä asiakkaiden suora pääsy sovellusporttiin. Proxyjen pitää välittää asiakkaan oikea osoite. Asetus ei hyväksy yleistä `true`-arvoa, hyppymäärää tai kaikkia osoitteita luottavaa `/0`-verkkoa. Asiakkaat, joilla on yhteinen julkinen IP tai joiden osoitteet Docker välittää samana yhdyskäytävän osoitteena, jakavat kiintiön.

Laskurit ovat yhden Node.js-prosessin muistissa ja nollautuvat sovelluksen käynnistyessä uudelleen. Useaa sovelluskonttia varten tarvitaan yhteinen laskurivarasto, esimerkiksi Redis. Rate limitit eivät yksin suojaa verkkoyhteyden tukkivalta DDoS-liikenteeltä.

Toteutuksen asetukset ja proxytoiminta: [express-rate-limit](https://express-rate-limit.mintlify.app/reference/configuration), [Expressin proxyohje](https://expressjs.com/en/guide/behind-proxies/).

AI Fish Sort -järjestelmä on vielä kehitysvaiheessa. Lopullista lajittelulaitetta ei ole vielä käytössä, eikä lopullinen kerättävä datasisältö ole täysin varmistunut.

Tästä syystä järjestelmä pyritään pitämään mahdollisimman modulaarisena. Toteutus voi muuttua hankkeen edetessä, kun lajittelulaitteesta, datasta ja loppukäyttäjien tarpeista saadaan tarkempaa tietoa.
