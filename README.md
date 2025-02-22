# Stonker

Stonker is a Telegram bot that helps you track stock investments, notifying you based on stock price changes.

## Deployment

Use Docker to deploy it:

```sh
git clone https://github.com/pgvalle/Stonker
cd Stonker
docker build -t stonker .
docker run -e TELEGRAM_BOT_TOKEN='your_token_str' -d -t stonker
```

**NOTE:** To get a Telegram bot token, talk to [@BotFather](https://t.me/BotFather).

## Usage

The bot supports the following commands:

- **/invest STOCK VALUE DIFF**
  - Simulates stock investment.
  - `VALUE` must be >= 1.00.
  - `DIFF` must be > 0.00 (triggers a notification when the invested value changes by this amount).
  - Reinvesting on the same stock overwrites the previous investment.
  - Only 2 decimals are used (e.g. 0.001 -> $0.00).
  - Values must be
  - Example:
    ```
    /invest AMD 1 0.01  # Notify at $2.00 or $0.00
    /invest NVDA 3.00 0.01  # Notify at $3.01 or $2.99
    /invest AMD 1 1  # Previous AMD investment gone
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
    ```

## The Journey

I was not familiar with stocks at all. That impacted all the development process, specially when I was looking for a way to collect real-time stock data. Initially, I thought [gadicc/node-yahoo-finance2](https://github.com/gadicc/node-yahoo-finance2) was going to help me, but it turned out not to be what i needed. After 2 days trying to make sense out of it, I found [gregtuc/StockSocket](https://github.com/gregtuc/StockSocket), which was exactly what I needed.

Another challenge was structuring the code. I started with everything in a single file, but after nearly a week, I finally managed to reorganize it. I struggled with design patterns and got frustrated at times, especially due to my tendency to strive for symmetry and perfection, which lead to me hanging for hours just trying to make my code "look good".

## Technology Stack

- **SQLite3** - I needed a lightweight database, and SQLite fit well for this project.
- **JavaScript** - Although I'm not a big fan of this language, it's widely used. And I wanted to improve my portfolio.
- **[yagop/node-telegram-bot-api](https://github.com/yagop/node-telegram-bot-api)** - I initially considered WhatsApp but found both its official and unofficial APIs restrictive (Needed to create a meta developer account or to have a spare phone number). In the end, Telegram turned out to be much better.
- **[gregtuc/StockSocket](https://github.com/gregtuc/StockSocket)** - Provides real-time stock data updates via websockets. Unfortunately it's archived, but it works.

## Future Improvements

- Better error handling.
- More refined notification settings (e.g., configurable notification intervals).
- Possible migration to a more scalable database if needed.

If you have suggestions or find bugs, feel free to contribute!
