#!/bin/bash

# Configuration
API_URL="${API_URL:-http://localhost:3000/v1}"
DATA_FILE="data.json"

# Check requirements
if ! command -v jq &> /dev/null; then
    echo "Error: jq is required but not installed."
    exit 1
fi

if [ ! -f "$DATA_FILE" ]; then
    echo "Error: $DATA_FILE not found."
    exit 1
fi

# Authentication
if [ -z "$ACCESS_TOKEN" ]; then
    echo "Authenticating..."
    if [ -z "$ADMIN_EMAIL" ]; then
        read -p "Admin Email: " ADMIN_EMAIL
    fi
    if [ -z "$ADMIN_PASSWORD" ]; then
        read -s -p "Admin Password: " ADMIN_PASSWORD
        echo
    fi

    RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "$(jq -n --arg email "$ADMIN_EMAIL" --arg password "$ADMIN_PASSWORD" '{email: $email, password: $password}')")
    
    ACCESS_TOKEN=$(echo "$RESPONSE" | jq -r '.access_token')
    
    if [ "$ACCESS_TOKEN" == "null" ] || [ -z "$ACCESS_TOKEN" ]; then
        echo "Authentication failed."
        echo "Response: $RESPONSE"
        exit 1
    fi
    echo "Authentication successful."
fi

AUTH_HEADER="Authorization: Bearer $ACCESS_TOKEN"

# Process Data
echo "Reading $DATA_FILE..."

# Iterate over tests
jq -c '.[]' "$DATA_FILE" | while read -r test_item; do
    TITLE=$(echo "$test_item" | jq -r '.title')
    DESCRIPTION=$(echo "$test_item" | jq -r '.description')
    LANGUAGE=$(echo "$test_item" | jq -r '.language')
    
    echo "Creating Test: $TITLE ($LANGUAGE)"
    
    # Create Test Payload
    TEST_PAYLOAD=$(jq -n \
        --arg title "$TITLE" \
        --arg desc "$DESCRIPTION" \
        --argjson testSpecificInfo "$(echo "$test_item" | jq -c '.test_specific_info // {}')" \
        '{title: $title, description: $desc, test_specific_info: $testSpecificInfo, isActive: true}')
        
    TEST_RESPONSE=$(curl -s -X POST "$API_URL/tests" \
        -H "Content-Type: application/json" \
        -H "$AUTH_HEADER" \
        -d "$TEST_PAYLOAD")
        
    TEST_ID=$(echo "$TEST_RESPONSE" | jq -r '.id')
    
    if [ "$TEST_ID" == "null" ]; then
        echo "Failed to create test: $TITLE"
        echo "$TEST_RESPONSE"
        continue
    fi
    
    echo "  Test created with ID: $TEST_ID"
    
    # Iterate over sections
    echo "$test_item" | jq -c '.sections[]' | while read -r section_item; do
        SEC_TITLE=$(echo "$section_item" | jq -r '.title')
        ORDER_INDEX=$(echo "$section_item" | jq -r '.orderIndex')
        
        echo "  Creating Section: $SEC_TITLE"
        
        SEC_PAYLOAD=$(jq -n \
            --arg title "$SEC_TITLE" \
            --argjson order "$ORDER_INDEX" \
            '{title: $title, orderIndex: $order, description: ""}')
            
        SEC_RESPONSE=$(curl -s -X POST "$API_URL/tests/$TEST_ID/sections" \
            -H "Content-Type: application/json" \
            -H "$AUTH_HEADER" \
            -d "$SEC_PAYLOAD")
            
        SEC_ID=$(echo "$SEC_RESPONSE" | jq -r '.id')
        
        if [ "$SEC_ID" == "null" ]; then
            echo "  Failed to create section: $SEC_TITLE"
            echo "  $SEC_RESPONSE"
            continue
        fi
        
        echo "    Section created with ID: $SEC_ID"
        
        # Iterate over questions
        echo "$section_item" | jq -c '.questions[]' | while read -r question_item; do
            Q_TEXT=$(echo "$question_item" | jq -r '.text')
            Q_TYPE=$(echo "$question_item" | jq -r '.type')
            Q_MAX_SCORE=$(echo "$question_item" | jq -r '.maxScore')
            Q_CONFIG=$(echo "$question_item" | jq -c '.config')
            
            # Truncate text for display
            Q_DISPLAY="${Q_TEXT:0:30}"
            if [ ${#Q_TEXT} -gt 30 ]; then Q_DISPLAY="${Q_DISPLAY}..."; fi
            
            echo "    Creating Question: $Q_DISPLAY"
            
            Q_PAYLOAD=$(jq -n \
                --arg text "$Q_TEXT" \
                --arg type "$Q_TYPE" \
                --argjson maxScore "$Q_MAX_SCORE" \
                --argjson config "$Q_CONFIG" \
                '{text: $text, type: $type, maxScore: $maxScore, config: $config}')
                
            Q_RESPONSE=$(curl -s -X POST "$API_URL/sections/$SEC_ID/questions" \
                -H "Content-Type: application/json" \
                -H "$AUTH_HEADER" \
                -d "$Q_PAYLOAD")
                
            Q_ID=$(echo "$Q_RESPONSE" | jq -r '.id')
            
            if [ "$Q_ID" == "null" ]; then
                echo "      Failed to create question."
                echo "      $Q_RESPONSE"
            else
                echo "      Question created with ID: $Q_ID"
            fi
        done
    done
done

echo "Done."

