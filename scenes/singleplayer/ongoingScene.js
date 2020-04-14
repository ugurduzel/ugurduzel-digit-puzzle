const Telegraf = require("telegraf");
const Extra = require("telegraf/extra");
const Markup = require("telegraf/markup");
const session = require("telegraf/session");
const Stage = require("telegraf/stage");
const Scene = require("telegraf/scenes/base");
const _ = require("lodash");

const commandArgsMiddleware = require("../../middleware/commandArgs");
const { getResult, notDistinct, getTime } = require("../../utils");

const ongoingScene = new Scene("ongoingScene");
ongoingScene.enter((ctx) => {
    return ctx.reply(`I have a ${ctx.session.game.number.length} digit number in mind.\n\nStart guessing... 🧐`);
});

ongoingScene.action("New Game", (ctx) => {
    delete ctx.session.game;
    return ctx.scene.enter("beginScene");
});

ongoingScene.command("newgame", (ctx) => {
    delete ctx.session.game;
    return ctx.scene.enter("beginScene");
});

ongoingScene.action("Quit", (ctx) => {
    const { number } = ctx.session.game;
    delete ctx.session.game;
    return ctx.reply(
        `Quitted\nThe number was ${number.join("")}`,
        Extra.HTML().markup((m) => m.inlineKeyboard([m.callbackButton("🎮 New Game", "New Game")]))
    );
});

ongoingScene.action("History", (ctx) => {
    const { history } = ctx.session.game;
    let s = "Your guesses,\n";
    for (let i = 0; i < history.length; i++) {
        s += "▪️ " + history[i].guess + " ➡️ ";
        s += history[i].result + "\n";
    }
    return ctx.reply(s);
});

ongoingScene.hears(/.*/, (ctx) => {
    if (!ctx.session.game) {
        return null;
    }
    if (isNaN(ctx.message.text)) {
        return ctx.reply(
            `Only send numbers!`,
            Extra.HTML().markup((m) =>
                m.inlineKeyboard([m.callbackButton("Get History", "History"), m.callbackButton("Quit", "Quit")])
            )
        );
    }
    if (isNaN(ctx.message.text) || ctx.message.text.length !== ctx.session.game.number.length) {
        return ctx.reply(
            `Only send ${ctx.session.game.number.length} digit numbers!`,
            Extra.HTML().markup((m) =>
                m.inlineKeyboard([m.callbackButton("Get History", "History"), m.callbackButton("Quit", "Quit")])
            )
        );
    }
    const digits = ctx.message.text.split("");
    if (digits.includes("0")) {
        return ctx.reply(
            `Cannot send a number with 0 in it!`,
            Extra.HTML().markup((m) =>
                m.inlineKeyboard([m.callbackButton("Get History", "History"), m.callbackButton("Quit", "Quit")])
            )
        );
    }
    if (notDistinct(digits) === true) {
        return ctx.reply(
            `All digits must be different!`,
            Extra.HTML().markup((m) =>
                m.inlineKeyboard([m.callbackButton("Get History", "History"), m.callbackButton("Quit", "Quit")])
            )
        );
    }

    const { won, result } = getResult(ctx.message.text, ctx.session.game.number);

    ctx.session.game.history.push({ guess: ctx.message.text, result });

    if (won) {
        const { game } = ctx.session;
        delete ctx.session.game;
        if (game.start) {
            return ctx.reply(
                `<b>Congrats!</b> 🎊🎉\n\nNumber is <b>${game.number.join("")}</b>.\nYou found it in ${getTime(
                    game.start
                )}. 🤯`,
                Extra.HTML().markup((m) => m.inlineKeyboard([m.callbackButton("🎮 New Game", "New Game")]))
            );
        }
        return ctx.reply(
            `<b>Congrats!</b> 🎊🎉\n\nNumber is <b>${game.number.join("")}</b>.\nYou found it in ${
                game.guesses
            } tries. 🤯`,
            Extra.HTML().markup((m) => m.inlineKeyboard([m.callbackButton("🎮 New Game", "New Game")]))
        );
    }
    ctx.session.game.guesses += 1;
    return ctx.reply(
        result,
        Extra.HTML()
            .inReplyTo(ctx.message.message_id)
            .markup((m) =>
                m.inlineKeyboard([m.callbackButton("Get History", "History"), m.callbackButton("Quit", "Quit")])
            )
    );
});

module.exports = ongoingScene;
