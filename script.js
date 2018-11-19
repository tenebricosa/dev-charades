function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

class Storage {
    static save(name, email, score) {
        const data = Storage.select();
        data[name] = {
            name,
            email,
            score
        }

        localStorage.setItem("data", JSON.stringify(data));
    }

    static get(name) {
        const data = Storage.select();
        return data[name] || null;
    }

    static select() {
        const data = localStorage.getItem("data")
        return data ? JSON.parse(data) : {};
    }
}

class Dispatcher {
    constructor() {
        this.listeners = {};
    }

    attach(message, callback) {
        this.listeners[message] = callback;
    }

    deattach(message) {
        delete this.listeners[message];
    }

    push(message, parameter) {
        this.listeners[message](parameter);
    }
}

class Game {
    constructor(config, levels) {
        this.config = config;
        this.level = shuffle(levels[config.level]);
        this.dispatcher = new Dispatcher();
    }

    push(message, parameter) {
        this.dispatcher.push(message, parameter);
    }

    async run() {
        while (true) {
            const user = await new RegistrationPage(this.dispatcher).run();
            const result = await new GamePage(this.dispatcher, user, this.config, this.level).run();
            Storage.save(result.name, result.email, result.score);
            // await new ResultPage(this.dispatcher, result).run();
        }
    }
}

class RegistrationPage {
    constructor(dispatcher) {
        this.dispatcher = dispatcher;
        this.resolver = null;
        this.page = document.querySelector(".registration");
        this.form = this.page.querySelector(".form");
    }

    run() {
        this.dispatcher.attach("register", this.register.bind(this))
        this.page.classList.remove("invisible");
        return new Promise(resolve => this.resolver = resolve);
    }

    end(user) {
        this.dispatcher.deattach("register");
        this.page.classList.add("invisible")
        this.form.reset();
        this.resolver(user);
    }

    register() {
        const data = new FormData(this.form);
        const user = {};
        for (let [key, value] of data.entries()) {
            user[key] = value;
        }

        if (user.name && user.email) {
            this.end(user);
        }
    }
}

class GamePage {
    constructor(dispatcher, user, config, tasks) {
        this.resolver = null;
        this.dispatcher = dispatcher;
        this.result = {
            name: user.name,
            email: user.email,
            score: 0
        }
        this.rounds = [...tasks];
        this.currentRoundIndex = 0;

        this.page = document.querySelector(".game");
        this.taskContainer = document.querySelector(".task");
        this.movie = document.querySelector("#movie");
        this.userInput = document.querySelector("#userInput");
    }

    initializeView() {
        this.page.classList.remove("invisible");
    }

    answer(userInput) {
        this.dispatcher.deattach("answer");
        const round = this.rounds[this.currentRoundIndex];
        round.rightAnswer === userInput ? this.nextRound(round.factor) : this.end();
    }

    renderRound(number) {
        this.clearTask();
        this.taskContainer.appendChild(this.createTaskTag(this.rounds[number]));
        this.dispatcher.attach("answer", this.answer.bind(this));
    }

    nextRound(factor) {
        this.result.score += factor;
        this.currentRoundIndex++;
        setTimeout(() => {
            this.userInput.value = "";
            if (this.currentRoundIndex === this.rounds.length) {
                return this.end();
            }
            this.renderRound(this.currentRoundIndex);
        }, 1000)
    }

    createTaskTag(task) {
        if (task.src) {
            const movie = document.createElement("video");
            movie.src = task.src;
            movie.width = 320;
            movie.height = 240;
            movie.autoplay = true;

            return movie;
        }
    }

    clearTask() {
        if (this.taskContainer.firstChild) {
            this.taskContainer.removeChild(this.taskContainer.firstChild);
        }
    }

    run() {
        this.initializeView();
        this.renderRound(0);
        return new Promise(resolve => this.resolver = resolve);
    }

    end() {
        this.clearTask();
        this.page.classList.add("invisible");
        this.resolver(this.result);
    }
}

class ResultPage {
    constructor(dispatcher, result) {
        this.resolver = null;
        this.dispatcher = dispatcher;
        this.result = result;
        this.page = document.querySelector(".gameover");
        this.resultContainer = document.querySelector(".result");
    }

    run() {
        this.dispatcher.attach("end", this.end.bind(this));
        this.page.classList.remove("invisible");
        this.resultContainer.textContent = this.result.score;
        return new Promise(resolve => this.resolver = resolve);
    }

    end() {
        this.dispatcher.deattach("end");
        this.page.classList.add("invisible");
        this.resolver();
    }
}

const game = new Game(config, levels);
game.run();