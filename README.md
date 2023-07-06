# MongoDB Change Steams

## Description

The purpose of this repository is to illustrate an issue with the implementation of the change streams feature in the Cosmos DB implementation of the MongoDB API

## How to reproduce

In order to use the repository, following the following steps:

- Rename to the `.env.example` file to `.env` and enter the values for the DB URL, DB name and collection name
- In the script `mongodb-playground/insert.mongodb.js` enter the DB and collection names (same as the ones in .env)
- Run `npm install`
- Run `npm run dev`
- When the prompt `Insert first batch of records now...` is displayed, execute the `insert.mongodb.js` script multiple times (at least two) with a few seconds in between each execution; this must be done within a 30 second period
- Notice the change events, their IDs and the cursor resume token values being printed to the console
- After 30 seconds the cursor will be closed and a message `Closed cursor1` should be displayed
- When the prompt `Insert second batch of records now...` is displayed, execute the script again a couple of times within the next 30 seconds

## Expected results

Following the steps above should have produced the following results:
- With every run of the `insert.mongodb.js` script, a change event should be printed to the console along with the decoded ID and resume token
- After the first cursor is closed, a second cursor is created with the ID of the very first change event. All the change events that were printed through cursor one - except the first event - should be printed instantly after the second cursor is created
- The change event IDs and resume tokens for each one of these events should match the IDs and resume tokens that were printed for the same events in round 1
- Any additional records inserted in the second batch should also be printed to the console

## Actual results

The actual results observed by following these steps are different from the expectations. Although all the change events except the first one are printed instantly as soon as the second cursor is created, the IDs of these change events are different from the IDs associated with the same events when they were printed the first time. In fact, the IDs are all equal to the ID of the last change event printed in the first round.

It seems that instead of properly storing the IDs with each change event and returning these correctly, the cursor is just returning the ID of the last change event for any events that occurred in the past.

This makes it very hard to reliably use the IDs to resume the change stream if, for any reason, it fails in the middle of processing.
