const fetch = require("node-fetch");
const cheerio = require("cheerio");
const embedMsg = require("../msgManager");
const { bold, inline, italic, titleCase, objectPrint } = embedMsg.stringHandler;

const header = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; rv:78.0) Gecko/20100101 Firefox/78.0",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-GB,en;q=0.5",
    Authorization: `Basic ${process.env.METART_TOKEN}`,
    "Upgrade-Insecure-Requests": "1",
    "Cache-Control": "max-age=0",
};

async function getGalleryList(model) {
    let result = await fetch(`http://members.metartvip.com/model/${model}/`, {
        credentials: "include",
        headers: header,
        method: "GET",
        mode: "cors",
    });

    const data = await result.text();
    const $ = cheerio.load(data);
    const galleryEl = $(".updates_table td");
    const gallery = [];
    galleryEl.each((i, e) => {
        let link = $(".gallery_image_cell_container a", e).attr("href");
        if (link.search("movie") == -1)
            gallery.push({
                url: $(".gallery_image_cell_container a", e).attr("href"),
                name: $(
                    ".gallery_information .update_information_gallery_name",
                    e
                ).text(),
                modelName: $(".update_information_model_name a", e).text(),
                count: parseInt(
                    $(".display_gallery_cell_photo", e).text().match(/[\d]+/)[0]
                ),
            });
    });
    return gallery;
}

async function getDownloadURL(url) {
    let result = await fetch(url, {
        credentials: "include",
        headers: header,
        method: "GET",
        mode: "cors",
    });

    const data = await result.text();
    const $ = cheerio.load(data);
    result = await fetch($(".media_download").attr("href"), {
        credentials: "include",
        headers: header,
        method: "GET",
        mode: "cors",
    });
    return result.url;
}

async function showPics(msg) {
    let modelName = msg.args[0],
        galNo = 0,
        start = 0,
        step = 10;
    if (msg.args.length > 1) galNo = msg.args[1];
    if (msg.args.length > 2) start = msg.args[2];
    if (msg.args.length > 3) step = msg.args[3];
    const gallery = await getGalleryList(modelName);
    const selected = gallery[galNo];
    for (let i = start + 1; i <= start + step; i++) {
        let url = `${selected.url}image/${i}/low/`;
        let durl = await getDownloadURL(url);
        msg.channel.send(durl);
        if (selected.count == i) break;
    }
}

async function getModels() {
    let list = [];
    for (let i = 65; i <= 90; i++) {
        let result = await fetch(
            `http://members.metartvip.com/models/all/${String.fromCharCode(i)}/`, {
                credentials: "include",
                headers: header,
                // referrer: "http://members.metartvip.com/models/all/",
                method: "GET",
                mode: "cors",
            }
        );
        const data = await result.text();
        const $ = cheerio.load(data);
        const listEl = $(".update_information_model_name");
        listEl.each((i, e) => {
            list.push($(e).text().toLowerCase().replace(" ", "-"));
        });
    }
    return list;
}

async function showModels(msg) {
    let query = "";
    if (msg.args.length > 1) query = msg.args[1];
    models = await getModels();
    models = models.filter((e) => e.search(query) != -1);
    models = models.slice(0, 10);

    let search_res = "";
    for (let i = 0; i < models.length; i++)
        search_res = search_res + `🔹 ${models[i]}\n`;
    let fields = [];
    fields.push({
        name: "Search Results",
        value: search_res,
    });
    embedMsg.fields = fields;
    embedMsg.footer.text = msg.author.tag;
    embedMsg.footer.icon_url = msg.author.avatarURL();
    msg.channel.send(embedMsg.getEmbedMessage());
}

async function showGalleries(msg) {
    let modelName = msg.args[0];
    const gallery = await getGalleryList(modelName);

    let search_res = "",
        start = 0;
    if (msg.args.length > 2) start = msg.args[2] - 1;
    for (let i = start * 10; i < gallery.length; i++) {
        search_res =
            search_res +
            `🔹 [${i}]\t ${bold(gallery[i].name)}(${bold(gallery[i].count)} pics)\n`;
        if (i == start * 10 + 10) break;
    }
    let fields = [];
    fields.push({
        name: "Search Results",
        value: search_res,
    });
    fields.push({
        name: "Page",
        value: `${parseInt(start) + 1} of ${Math.floor(gallery.length / 10)}`,
    });
    embedMsg.fields = fields;
    embedMsg.footer.text = msg.author.tag;
    embedMsg.footer.icon_url = msg.author.avatarURL();
    msg.channel.send(embedMsg.getEmbedMessage());
}

metart = function(msg) {
    if (!msg.channel.nsfw) return "This is not a nsfw channel";
    if (msg.args.length == 0) return "Provide the model name";
    if (msg.args[0] == "list") showModels(msg);
    else if (msg.args[1] == "list") showGalleries(msg);
    else showPics(msg);
    return "";
};

module.exports = { metart };