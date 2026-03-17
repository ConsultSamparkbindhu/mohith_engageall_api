/* eslint-disable prettier/prettier */
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
  const prefix = user === 'Customer' ? 'BYR' : 'SLR';

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

    let newSk = '';
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

    // Generate the new `sk` (e.g., 'user#BYR001', 'user#SLR001'
    newSk = `user#${prefix}${String(nextNumber).padStart(3, '0')}`;
    console.log('Generated sk:', newSk);
    const userCode = `${prefix}${String(nextNumber).padStart(3, '0')}`;

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

  try {

    // Fetch all users for the org
    const [rows] = await db.query(
      `SELECT * FROM users WHERE org_id = ?`,
      [orgId]
    );

    const customers = [];
    const suppliers = [];

    rows.forEach((item) => {

      if (item.user_code.startsWith("BYR")) {
        customers.push(item);
      } 
      else if (item.user_code.startsWith("SLR")) {
        suppliers.push(item);
      }

    });

    res.status(200).json({
      message: "Users fetched successfully",
      customers,
      suppliers
    });

  } catch (error) {

    console.error("Error while fetching user details:", error);

    res.status(500).json({
      message: "Error",
      error: error.message
    });

  }

}