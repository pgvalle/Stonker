# Stonker

# WARNING: The current state of this piece of software is unusable and this readme is outdated

Stonker is a Telegram bot that helps you track stock investments,
notifying you when stock prices change.
No more constantly checking prices—Stonker has you covered.

> **DISCLAIMER:** Invest at your own risk, even with Stonker at your service.
I take no responsibility for any financial outcomes.

---

## Setting up and running

### 1. Requirements

- Node.js **18+** (Older versions may work but are untested.)

### 2. Get Your Token

You need a Telegram bot token. Talk to [@BotFather](https://t.me/BotFather) to obtain one.

### 3. Running the Bot

#### Option 1: Without Docker

```sh
git clone https://github.com/pgvalle/Stonker
cd Stonker
npm install
export TELEGRAM_BOT_TOKEN='your_token_here'
node src/bot.js
```

#### Option 2: With Docker

```sh
git clone https://github.com/pgvalle/Stonker
cd Stonker
docker build -t stonker .
docker run -e TELEGRAM_BOT_TOKEN='your_token_here' -d stonker
```

## Commands

**TODO:** document commands here.
<!-- - **/invest STOCK VALUE DIFF**
  - Simulates stock investment.
  - `VALUE` must be >= 1.00.
  - `DIFF` must be > 0.00 (notification each time VALUE changes by DIFF).
  - Reinvesting on the same stock overwrites the previous investment.
  - Only 2 decimals are used (e.g. 0.001 -> $0.00).
  - Example:
    ```
    /invest AMD 1 0.01
    /invest AMD 1.00 1  # Overwrites previous investment
    ```

- **/linvest [STOCK ...]**
  - Lists your investments in specified stocks.
  - If no arguments are provided, lists all investments.
  - Example:
    ```
    /linvest
    /linvest AMD TSLA NVDA
    ```

- **/dinvest [STOCK ...]**
  - Deletes your investments in specified stocks.
  - If no arguments are provided, deletes all investments.
  - Example:
    ```
    /dinvest
    /dinvest AMD TSLA NVDA
    ```

- **/stock [STOCK ...]**
  - Lists specified stocks and their last known prices.
  - If no arguments are provided, lists all tracked stocks.
  - The bot just knows stocks that users have invested with /invest.
  - Example:
    ```
    /stock
    /stock AMD TSLA NVDA
    ```

- **/help [COMMAND ...]**
  - Shows help for specified commands.
  - If no arguments are provided, lists all commands.
  - Example:
    ```
    /help
    /help invest stock
    ``` -->

## Motivation

A realization hit me after playing a little bit with the stock market and talking to friends:
Either you are extremely lucky, 
rivileged with relevant information or have time monitor stock prices every second.
But I bet you are none of those, just like me.
So here is Stonker to help you.

## The Journey

I was not familiar with stocks at all.
When I was looking for a way to collect real-time stock data, I thought
[gadicc/node-yahoo-finance2](https://github.com/gadicc/node-yahoo-finance2) was going to help me,
but it turned out not to be what I needed.
After 2 days trying to make sense out of it,
I found [gregtuc/StockSocket](https://github.com/gregtuc/StockSocket),
which was exactly what I needed.

Another challenge was structuring the code.
I started with everything in a single file, but after nearly a week,
I finally managed to reorganize it.
I struggled with design patterns and got frustrated at times,
especially due to my tendency to strive for symmetry and perfection,
which lead to me hanging for hours just trying to make my code "look good".

After a couple weeks of having a half-working release,
I decided to simplify the project.
Initially, I wanted Stonker to watch Stocks for multiple users independently.
However, I decided to go for a single-user approach later,
because this requirement was just complicating everything.

## Technology Stack

- **SQLite3** - I demanded persistence, and sqlite already does the heavylifting of data manipulation for you.
- **NodeJS** - Using it would improve my portfolio.
  Javascript is a big name and I have never played much with it before this project.
- **[yagop/node-telegram-bot-api](https://github.com/yagop/node-telegram-bot-api)** - Initially, I considered WhatsApp,
  because here in Brazil **EVERYONE** has a Whatsapp account.
  But all the options I had required stuff like creating an account or having a spare phone number.
  Telegram turned out to be a better option.
- **[gregtuc/StockSocket](https://github.com/gregtuc/StockSocket)** - Provides real-time stock data updates via websockets.
  It's archived, but it works.
- **[Docker](https://www.docker.com/)** - A friend of mine suggested me to use docker.
  I think it was a great idea.

## Future Improvements

If you have suggestions or find bugs, feel free to contribute!

## Meme

Just for the sake of it.

![Stonks](https://media.tenor.com/id8Pj5h70zgAAAAe/stonks.png)
