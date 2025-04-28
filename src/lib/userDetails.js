'use strict';

import { DynamoDB } from 'aws-sdk';

const db = new DynamoDB.DocumentClient({ region: 'ap-south-1' });

/**
 * Inserts organization details into DynamoDB.
 * @param {string} orgId - The unique identifier for the organization.
 * @param {Object} orgDetails - The profile details of the organization.
 * @returns{object}
 */

export async function UserDetails(req, res) {
  const data = req.body;
  const { pk, user } = data;

  // Determine prefix based on user type
  const prefix = user === 'customer' ? 'BYR' : 'SLR';

  try {
    // Query the table to get the last used `sk` with the specific prefix
    const queryParams = {
      TableName: process.env.ORGANIZATION_TABLE,
      KeyConditionExpression: 'pk = :pk and begins_with(sk, :prefix)', // Use begins_with in KeyConditionExpression
      ExpressionAttributeValues: {
        ':pk': pk,
        ':prefix': `user#${prefix}`, // Ensure the prefix includes `user#`
      },
      ScanIndexForward: false, // Get the latest item first
      Limit: 1, // Only need the latest entry
    };

    const queryResult = await db.query(queryParams).promise();

    let newSk;
    let nextNumber = 1; // Default value for the first item

    // Check if there are previous items
    if (queryResult.Items && queryResult.Items.length > 0) {
      const lastSk = queryResult.Items[0].sk;

      // Extract the numeric part from sk using a regular expression (after 'user#BYR' or 'user#SLR')
      const match = lastSk.match(/user#\w{3}(\d+)/);
      if (match && match[1]) {
        const lastNumber = parseInt(match[1], 10); // Extract and parse the numeric part
        nextNumber = lastNumber + 1; // Increment the number
      }
    }

    // Generate the new `sk` (e.g., 'user#BYR001', 'user#SLR001')
    newSk = `user#${prefix}${String(nextNumber).padStart(3, '0')}`;
    console.log('Generated sk:', newSk);
    const userCode = `${prefix}${String(nextNumber).padStart(3, '0')}`

    // Add user details with the generated `sk`
    const params = {
      TableName: process.env.ORGANIZATION_TABLE,
      Item: {
        pk: pk,
        sk: newSk,
        userCode, // Unique sk for the new user
        ...data, // Spread the rest of the user data into the item
      },
    };

    // Save the new user to the DynamoDB table
    await db.put(params).promise();
    console.log('User details added successfully with sk:', newSk);

    // Respond with success message
    res.status(200).json({ message: 'User added successfully', sk: newSk });
  } catch (error) {
    console.error('Error while adding user details:', error);
    res.status(500).json({ message: 'Error', error: error.message });
  }
}

export async function GetUserDetails(req, res) {
  const { orgId } = req.query;
  const pk = orgId;

  // DynamoDB query to fetch only items where the sort key starts with 'user#'
  const params = {
    TableName: process.env.ORGANIZATION_TABLE,
    KeyConditionExpression: 'pk = :pk AND begins_with(sk, :skPrefix)',
    ExpressionAttributeValues: {
      ':pk': pk,
      ':skPrefix': 'user#', // Only fetch items with sk that starts with 'user#'
    },
  };

  try {
    // Query DynamoDB
    const result = await db.query(params).promise();

    // Filter and categorize the results based on the `sk` prefix
    const customers = [];
    const suppliers = [];

    result.Items.forEach((item) => {
      const sk = item.sk;
      if (sk.startsWith('user#BYR')) {
        customers.push(item);
      } else if (sk.startsWith('user#SLR')) {
        suppliers.push(item);
      }
    });

    // Send categorized data to the front end
    res.status(200).json({
      message: 'Users fetched successfully',
      customers,
      suppliers,
    });
  } catch (error) {
    console.error('Error while fetching user details:', error);
    res.status(500).json({ message: 'Error', error: error.message });
  }
}
