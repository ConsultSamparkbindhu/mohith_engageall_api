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
export async function OrgDetails(req, res) {
  const data = req.body;
  console.log(data, 'data');
  const pk = data.orgId;

  const params = {
    TableName: process.env.ORGANIZATION_TABLE, // Ensure this environment variable is set
    Item: {
      pk: pk, // Prefix the pk with the organization name
      sk: 'profile',
      ...data,
    },
  };

  try {
    const result = await db.put(params).promise();
    console.log('Organization details inserted successfully!');
    return result;
  } catch (error) {
    console.error('Error while inserting Organization details:', error);
    return { message: 'Error', error: error.message };
  }
}

export async function GetOrgDetails(req, res) {
  const { orgId } = req.query;
  const data = req.body;
  console.log(data, 'data');
  const pk = orgId;

  const params = {
    TableName: process.env.ORGANIZATION_TABLE, // Ensure this environment variable is set
    Key: {
      pk: pk, // Partition key
      sk: 'profile', // Sort key
    },
  };

  try {
    const result = await db.get(params).promise();
    console.log('Organization details fetched successfully!');
    return result;
  } catch (error) {
    console.error('Error while fetching Organization details:', error);
    return { message: 'Error', error: error.message };
  }
}
